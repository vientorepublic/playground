/**
 * 국회 입법예고(pal.assembly.go.kr)의 최근 입법예고 데이터를 크롤링하고 JSON으로 변환하는 작업을
 * 단순화하도록 도와주는 모듈
 * 활용 방법과 예시에 대한 코드를 남깁니다.
 *
 * 기본적으로 모든 개별 입법예고에 대한 데이터는 `ITableData` 인터페이스로 표현됩니다.
 * 추가 필드가 필요한 경우 다른 인터페이스에서 확장됩니다.
 * 자세한 타입 정의는 각 클래스/메소드의 JSDoc, 또는 pal-crawl 프로젝트의 README 문서를 참고하세요.
 */

import { PalCrawl } from "pal-crawl";

const palCrawl = new PalCrawl();
const table = await palCrawl.get();

console.log("[ 국회 진행중 입법예고 목록 ]");
console.log("=====");
table.forEach((data) => {
  console.log(`의안번호: ${data.num}`);
  console.log(`법안명: ${data.subject}`);
  console.log(`제안자 구분: ${data.proposerCategory}`);
  console.log(`소관위원회: ${data.committee}`);
  console.log(`의견수: ${data.numComments}`);
  console.log(`링크: ${data.link}`);
  console.log("=====");
});
