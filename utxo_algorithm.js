/**
 * 최적화된 BnB UTXO Selection with Fee Calculation (Iterative version)
 * - P2PKH 가정: Input 148 bytes, Output 34 bytes, Overhead 10 bytes
 */
const BYTES_PER_INPUT = 148;
const BYTES_PER_OUTPUT = 34;
const BYTES_OVERHEAD = 10;

function selectUtxoBnBOptimized(utxos, targetAmount, feeRate) {
  // 1. Effective Value 계산 및 필터링
  // Effective Value = UTXO Amount - (Input Size * Fee Rate)
  const effectiveUtxos = utxos
    .map((amount, originalIndex) => ({
      amount,
      effectiveValue: amount - BYTES_PER_INPUT * feeRate,
      originalIndex,
    }))
    .filter((u) => u.effectiveValue > 0) // 수수료보다 가치가 낮은 Dust 제거
    .sort((a, b) => b.effectiveValue - a.effectiveValue); // 내림차순 정렬

  // 목표 금액: 사용자가 보낼 금액 + 기본 수수료(Output + Overhead)
  const target = targetAmount + (BYTES_PER_OUTPUT + BYTES_OVERHEAD) * feeRate;

  // Cost of Change: Change Output을 만드는 비용 (더하면 손해인 한계점)
  // 만약 남은 금액이 이 비용보다 작다면, Change를 만들지 않고 수수료로 더 주는 게 이득
  const costOfChange = (BYTES_PER_OUTPUT + BYTES_OVERHEAD) * feeRate;
  const upperBound = target + costOfChange;

  // Pruning용: 남은 유효 UTXO들의 합계 미리 계산
  const totalRemaining = new Array(effectiveUtxos.length);
  let sum = 0;
  for (let i = effectiveUtxos.length - 1; i >= 0; i--) {
    sum += effectiveUtxos[i].effectiveValue;
    totalRemaining[i] = sum;
  }

  // 탐색을 위한 스택
  const stack = [
    {
      idx: 0,
      currentEffectiveSum: 0,
      selectedUtxos: [],
    },
  ];

  let bestSelection = null;

  while (stack.length > 0) {
    const { idx, currentEffectiveSum, selectedUtxos } = stack.pop();

    // [성공 조건] 목표 범위 내에 들어온 경우 (Exact Match or Dust Threshold)
    if (currentEffectiveSum >= target && currentEffectiveSum <= upperBound) {
      bestSelection = selectedUtxos.map((u) => u.amount);
      break; // 최적의 조합(Change 없음) 발견 시 즉시 종료 (BnB 특성상)
    }

    // [실패 조건] 끝까지 도달했거나 이미 상한선을 넘은 경우
    if (idx >= effectiveUtxos.length || currentEffectiveSum > upperBound) {
      continue;
    }

    // [Pruning] 남은 모든 UTXO를 다 더해도 target에 못 미치면 탐색 중단
    if (currentEffectiveSum + totalRemaining[idx] < target) {
      continue;
    }

    // 효율적인 탐색 (DFS): 포함하는 경우를 먼저 탐색할지, 미포함을 먼저 할지는 전략에 따라 다름
    // 보통 큰 UTXO를 포함하는 쪽이 목표에 빨리 도달할 확률이 높으므로 '포함'을 스택의 상단(나중에 push)에 둠

    // Case A: 현재 UTXO 미포함
    stack.push({
      idx: idx + 1,
      currentEffectiveSum: currentEffectiveSum,
      selectedUtxos: [...selectedUtxos],
    });

    // Case B: 현재 UTXO 포함
    stack.push({
      idx: idx + 1,
      currentEffectiveSum: currentEffectiveSum + effectiveUtxos[idx].effectiveValue,
      selectedUtxos: [...selectedUtxos, effectiveUtxos[idx]],
    });
  }

  // 결과 반환 객체 구성
  if (bestSelection) {
    const inputCount = bestSelection.length;
    // 실제 트랜잭션 사이즈 (Change Output 없음 가정)
    const txSize = inputCount * BYTES_PER_INPUT + BYTES_PER_OUTPUT + BYTES_OVERHEAD;
    const fee = txSize * feeRate;
    const totalSelectedAmount = bestSelection.reduce((a, b) => a + b, 0);

    return {
      selectedUtxos: bestSelection,
      fee: fee,
      totalAmount: totalSelectedAmount,
      excess: totalSelectedAmount - targetAmount - fee, // 남는 금액 (Miner에게 감)
    };
  }

  return null;
}

// --- 테스트 ---
const utxos = Array.from({ length: 100 }, () => Math.floor(Math.random() * 100000));
const targetAmount = 50000;
const feeRate = 20; // satoshis/byte

console.log("UTXO 목록 (금액):", utxos);
console.log("목표 금액:", targetAmount);
console.log("수수료율 (satoshi/byte):", feeRate);

console.log(`[설정] 목표 금액: ${targetAmount}, 수수료율: ${feeRate}`);
console.time("BnB Execution Time");
const result = selectUtxoBnBOptimized(utxos, targetAmount, feeRate);
console.timeEnd("BnB Execution Time");

if (result) {
  console.log("선택된 UTXO 개수:", result.selectedUtxos.length);
  console.log("총 선택 금액:", result.totalAmount);
  console.log("계산된 수수료:", result.fee);
  console.log("보내는 금액 + 수수료:", targetAmount + result.fee);
  console.log("초과분 (Miner Tip):", result.excess);
} else {
  console.log("적절한 조합을 찾지 못했습니다.");
}
