/**
 * FlowAuth(https://auth.viento.me) 플랫폼의 OAuth2/OIDC 통합을 위한 클라이언트 SDK
 * 활용 방법과 예시에 대한 코드를 남깁니다.
 * OAuth2 플로우 제어와 Authorization Code Grant, 토큰 리프래시 등의 모든 코드 구현 예시는 아래를 참고하세요.
 */

import "dotenv/config";
import { FlowAuthClient, OAuth2Scope, OAuth2ResponseType, OIDCUtils } from "flowauth-oauth2-client";
import { createInterface } from "readline";

/**
 * Get OAuth2 Client Info from environment variables
 * @returns {{clientId: string, clientSecret: string}}
 */
function getOAuth2CLientInfo() {
  const clientId = process.env.FLOWAUTH_CLIENT_ID;
  const clientSecret = process.env.FLOWAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing variables FLOWAUTH_CLIENT_ID or FLOWAUTH_CLIENT_SECRET");
  }
  return {
    clientId,
    clientSecret,
  };
}

// 설정 상수
const CONFIG = {
  server: "https://authserver.viento.me",
  redirectUri: "https://auth.viento.me/callback",
  clientId: null,
  clientSecret: null,
  scopes: [OAuth2Scope.OPENID, OAuth2Scope.PROFILE, OAuth2Scope.EMAIL],
};

// 공통 클라이언트 생성 함수
function createClient() {
  return new FlowAuthClient({
    server: CONFIG.server,
    clientId: CONFIG.clientId,
    clientSecret: CONFIG.clientSecret,
    redirectUri: CONFIG.redirectUri,
  });
}

// 공통 사용자 입력 처리 함수
function getUserInput(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// 4. 암호화 검증 기능 테스트 (RSA/ECDSA)
async function cryptoValidationTest() {
  console.log("\n[CRYPTO TEST] 암호화 검증 기능 테스트 (RSA/ECDSA)");
  const client = createClient();

  try {
    // OIDC Discovery 문서 가져오기
    console.log("[DISCOVERY] OIDC Discovery 문서 가져오기...");
    const discovery = await client.getDiscoveryDocument();
    console.log("[SUCCESS] Discovery 문서:", {
      issuer: discovery.issuer,
      jwks_uri: discovery.jwks_uri,
      supported_algorithms: discovery.id_token_signing_alg_values_supported,
    });

    // JWKS 가져오기 및 키 정보 표시
    if (discovery.jwks_uri) {
      console.log("\n[JWKS] JWKS 키 정보 가져오기...");
      const jwks = await OIDCUtils.getJwks(discovery.jwks_uri);
      console.log("[SUCCESS] 사용 가능한 키들:");

      jwks.keys.forEach((key, index) => {
        console.log(`  키 ${index + 1}:`);
        console.log(`    - 키 타입: ${key.kty}`);
        console.log(`    - 키 ID: ${key.kid}`);
        console.log(`    - 알고리즘: ${key.alg}`);
        console.log(`    - 용도: ${key.use || "서명"}`);

        if (key.kty === "RSA") {
          console.log(`    - RSA 매개변수: n=${key.n ? "O" : "X"}, e=${key.e ? "O" : "X"}`);
        } else if (key.kty === "EC") {
          console.log(`    - ECDSA 곡선: ${key.crv}`);
          console.log(`    - ECDSA 좌표: x=${key.x ? "O" : "X"}, y=${key.y ? "O" : "X"}`);
        }
        console.log("");
      });
    }

    // 실제 인증 플로우
    console.log("\n[AUTH] 암호화 검증을 위한 인증 시작...");
    const { authUrl, codeVerifier, state, nonce } = await client.createSecureAuthorizeUrl(CONFIG.scopes);

    console.log("[URL] 인증 URL:", authUrl);
    console.log("[READY] 암호화 검증 준비 완료:");
    console.log("  - JWKS 키 확인: OK");
    console.log("  - RSA/ECDSA 자동 감지 활성화: OK");
    console.log("  - Nonce 생성:", nonce ? "OK" : "SKIP");

    const code = await getUserInput("Authorization Code를 입력하세요 (암호화 검증 테스트): ");
    await handleTokenExchange(client, code, codeVerifier, nonce);
  } catch (error) {
    console.error("[ERROR] 암호화 검증 테스트 오류:", error.message);

    // 상세한 에러 분석
    if (error.message.includes("JWKS")) {
      console.log("[INFO] JWKS 관련 오류 - 서버 설정을 확인하세요.");
    } else if (error.message.includes("signature")) {
      console.log("[INFO] 서명 검증 오류 - 키가 올바르게 설정되었는지 확인하세요.");
    } else if (error.message.includes("algorithm")) {
      console.log("[INFO] 알고리즘 오류 - 서버가 RSA 또는 ECDSA를 사용하는지 확인하세요.");
    }
  }
}

// 5. 수동 키 검증 테스트
async function manualKeyValidationTest() {
  console.log("\n[MANUAL] 수동 키 검증 및 고급 기능 테스트");

  try {
    console.log("[DISCOVERY] Discovery 문서에서 JWKS URI 가져오기...");
    const discoveryUrl = `${CONFIG.server}/.well-known/openid-configuration`;
    const discovery = await OIDCUtils.getDiscoveryDocument(CONFIG.server);

    if (!discovery.jwks_uri) {
      throw new Error("JWKS URI를 찾을 수 없습니다.");
    }

    console.log("[JWKS] JWKS에서 키 정보 분석...");
    const jwks = await OIDCUtils.getJwks(discovery.jwks_uri);

    // 각 키에 대해 검증 테스트
    for (const key of jwks.keys) {
      console.log(`\n[KEY] 키 ${key.kid} 분석:`);
      console.log(`  - 타입: ${key.kty}`);
      console.log(`  - 알고리즘: ${key.alg}`);

      try {
        let publicKey;
        if (key.alg === "RS256" && key.kty === "RSA") {
          console.log("  - RSA 키 가져오기 시도...");
          publicKey = await OIDCUtils.getPublicKey(discovery.jwks_uri, key.kid, "RS256");
          console.log("  - [OK] RSA 키 가져오기 성공");
        } else if (key.alg === "ES256" && key.kty === "EC") {
          console.log("  - ECDSA 키 가져오기 시도...");
          publicKey = await OIDCUtils.getPublicKey(discovery.jwks_uri, key.kid, "ES256");
          console.log("  - [OK] ECDSA 키 가져오기 성공");
        } else {
          console.log(`  - [SKIP] 지원되지 않는 알고리즘: ${key.alg}`);
          continue;
        }

        console.log("  - 키 타입:", publicKey.type);
        console.log("  - 키 용도:", publicKey.usages.join(", "));
      } catch (error) {
        console.log(`  - [FAIL] 키 가져오기 실패: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("[ERROR] 수동 키 검증 오류:", error.message);
  }
}

// 공통 토큰 처리 및 사용자 정보 가져오기
async function handleTokenExchange(client, code, codeVerifier = null, nonce = null) {
  try {
    const token = await client.exchangeCode(code, codeVerifier);
    console.log("[SUCCESS] 토큰 교환 성공:", token);

    const profile = await client.getUserInfo(token.access_token);
    console.log("[SUCCESS] 사용자 프로필:", profile);

    // ID 토큰이 있으면 검증 (새로운 암호화 지원)
    if (token.id_token) {
      try {
        console.log("[CRYPTO] ID 토큰 암호화 검증 시작...");
        const idTokenPayload = await client.validateIdToken(token.id_token, nonce);
        console.log("[SUCCESS] ID 토큰 암호화 검증 성공:", {
          algorithm: "Auto-detected (RSA/ECDSA)",
          subject: idTokenPayload.sub,
          issuer: idTokenPayload.iss,
          audience: idTokenPayload.aud,
          expiration: new Date(idTokenPayload.exp * 1000).toISOString(),
          issuedAt: new Date(idTokenPayload.iat * 1000).toISOString(),
        });

        // 추가 검증 정보 표시
        console.log("[INFO] ID 토큰 상세 정보:");
        console.log("  - Email:", idTokenPayload.email || "없음");
        console.log("  - Name:", idTokenPayload.name || "없음");
        console.log("  - Nonce:", idTokenPayload.nonce || "없음");
      } catch (error) {
        console.warn("[WARN] ID 토큰 검증 실패:", error.message);
        console.log("[INFO] 가능한 원인:");
        console.log("  - 서명이 유효하지 않음");
        console.log("  - JWKS 키를 가져올 수 없음");
        console.log("  - 알고리즘이 지원되지 않음 (RSA/ECDSA만 지원)");
        console.log("  - 토큰이 만료됨");
      }
    }

    return { token, profile };
  } catch (error) {
    console.error("[ERROR] 토큰 처리 오류:", error.message);
    throw error;
  }
}

// 1. 기본 OAuth2 인증 (새로운 통합 API 사용)
async function basicOAuth2Flow() {
  console.log("\n[BASIC] 기본 OAuth2 Authorization Code Flow");
  const client = createClient();

  try {
    // 새로운 통합 API 사용 - 스코프에 따라 자동으로 responseType 결정
    const authUrl = client.createAuthorizeUrl(CONFIG.scopes, {
      state: "basic-oauth2-state-123",
    });

    console.log("[URL] 인증 URL:", authUrl);
    console.log("[INFO] OIDC 스코프가 포함되어 자동으로 'code id_token' 타입으로 설정됩니다.");

    const code = await getUserInput("Authorization Code를 입력하세요: ");
    await handleTokenExchange(client, code);
  } catch (error) {
    console.error("[ERROR] 기본 OAuth2 플로우 오류:", error.message);
  }
}

// 2. 보안 강화된 PKCE 인증 (자동으로 OIDC 지원)
async function secureOAuth2FlowWithPKCE() {
  console.log("\n[SECURE] 보안 강화된 PKCE + OIDC Flow");
  const client = createClient();

  try {
    // 새로운 createSecureAuthorizeUrl - OIDC 자동 감지 및 nonce 자동 생성
    const { authUrl, codeVerifier, state, nonce } = await client.createSecureAuthorizeUrl(CONFIG.scopes);

    console.log("[URL] 보안 인증 URL:", authUrl);
    console.log("[SECURITY] 생성된 보안 파라미터:");
    console.log("  - State:", state);
    console.log("  - PKCE 활성화: OK");
    console.log("  - Nonce (OIDC):", nonce ? "OK" : "SKIP");

    const code = await getUserInput("Authorization Code를 입력하세요: ");
    await handleTokenExchange(client, code, codeVerifier, nonce);
  } catch (error) {
    console.error("[ERROR] 보안 OAuth2 플로우 오류:", error.message);
  }
}

// 3. 사용자 정의 플로우 (모든 옵션 활용)
async function customFlow() {
  console.log("\n[CUSTOM] 사용자 정의 Flow (모든 옵션 활용)");
  const client = createClient();

  try {
    // 모든 보안 파라미터를 수동으로 생성
    const pkce = await FlowAuthClient.generatePKCE();
    const state = await FlowAuthClient.generateState();
    const nonce = await FlowAuthClient.generateNonce();

    // 새로운 통합 API로 완전 커스터마이징된 URL 생성
    const authUrl = client.createAuthorizeUrl(CONFIG.scopes, {
      state: state,
      pkce: pkce,
      nonce: nonce,
      responseType: OAuth2ResponseType.CODE_ID_TOKEN, // Hybrid Flow
    });

    console.log("[URL] 완전 커스터마이징된 인증 URL:", authUrl);
    console.log("[PARAMS] 보안 파라미터들:");
    console.log("  - State:", state);
    console.log("  - PKCE Code Challenge:", pkce.codeChallenge);
    console.log("  - Nonce:", nonce);
    console.log("  - Response Type: Hybrid Flow (code + id_token)");

    const code = await getUserInput("Authorization Code를 입력하세요: ");
    await handleTokenExchange(client, code, pkce.codeVerifier, nonce);
  } catch (error) {
    console.error("[ERROR] 커스텀 플로우 오류:", error.message);
  }
}

// 메인 메뉴 함수
async function showMenu() {
  console.log("\n" + "=".repeat(60));
  console.log("FlowAuth OAuth2 Client SDK Demo");
  console.log("=".repeat(60));
  console.log("1. 기본 OAuth2 Flow (자동 설정)");
  console.log("2. 보안 강화 Flow (PKCE + 자동 OIDC)");
  console.log("3. 사용자 정의 Flow (모든 옵션)");
  console.log("4. [CRYPTO] 암호화 검증 테스트 (RSA/ECDSA)");
  console.log("5. [MANUAL] 수동 키 검증 및 고급 기능");
  console.log("0. 종료");
  console.log("=".repeat(60));

  const choice = await getUserInput("선택하세요 (0-5): ");

  switch (choice) {
    case "1":
      await basicOAuth2Flow();
      break;
    case "2":
      await secureOAuth2FlowWithPKCE();
      break;
    case "3":
      await customFlow();
      break;
    case "4":
      await cryptoValidationTest();
      break;
    case "5":
      await manualKeyValidationTest();
      break;
    case "0":
      console.log("[EXIT] 프로그램을 종료합니다.");
      return false;
    default:
      console.log("[ERROR] 잘못된 선택입니다.");
  }

  return true;
}

// 프로그램 실행
async function main() {
  const clientInfo = getOAuth2CLientInfo();
  CONFIG.clientId = clientInfo.clientId;
  CONFIG.clientSecret = clientInfo.clientSecret;

  let continueMenu = true;
  while (continueMenu) {
    try {
      continueMenu = await showMenu();

      if (continueMenu) {
        const restart = await getUserInput("\n다른 예제를 실행하시겠습니까? (y/n): ");
        if (restart.toLowerCase() !== "y") {
          continueMenu = false;
        }
      }
    } catch (error) {
      console.error("[ERROR] 프로그램 오류:", error.message);
      continueMenu = false;
    }
  }
}

// 프로그램 시작
main().catch(console.error);
