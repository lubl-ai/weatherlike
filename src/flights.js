// 거리 기반 왕복 항공권 가격 추정
// 실제 항공사 API(Amadeus, Skyscanner 등)는 API 키·유료 계약이 필요하므로,
// 여기서는 두 지점 사이의 대권거리(great-circle distance)를 이용한 추정 모델을 사용한다.
// 결과에는 항상 "추정" 라벨을 붙여 사용자에게 실제 판매가와 다를 수 있음을 명시한다.

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// 하버사인 공식으로 두 좌표 사이 거리(km) 계산
export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// destination id를 안정적인 0~1 값으로 변환 (가격에 자연스러운 편차를 주되 매번 동일하게)
function seededVariance(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // -0.08 ~ +0.08 범위
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 0.16;
}

// 거리 구간별 km당 단가 (원). 왕복 기준.
// 단거리는 고정비 비중이 커서 km당 비싸고, 초장거리는 프리미엄이 붙는다.
function ratePerKm(distanceKm) {
  const BASE = 120000; // 유류할증·세금 등 고정비
  let variable = 0;
  let remaining = distanceKm;

  const bands = [
    { upTo: 2000, rate: 100 },
    { upTo: 6000, rate: 85 },
    { upTo: Infinity, rate: 140 },
  ];
  let prev = 0;
  for (const band of bands) {
    const span = Math.min(remaining, band.upTo - prev);
    if (span <= 0) break;
    variable += span * band.rate;
    remaining -= span;
    prev = band.upTo;
    if (remaining <= 0) break;
  }
  return BASE + variable;
}

// 예산 등급(budget)이 항공권 클래스/시즌 선택에 주는 대략적 배수
const BUDGET_MULT = {
  low: 0.92, // 저가 항공사·비수기 위주
  mid: 1.0,
  high: 1.18, // 성수기·정규 항공사 여유
};

// 왕복 항공권 추정가 계산
// origin, dest: { lat, lon }
// destId: 편차 시드용 (선택)
// budget: 'low' | 'mid' | 'high' (선택)
export function estimateRoundTripFare(origin, dest, destId = '', budget = 'mid') {
  const distance = haversineKm(origin.lat, origin.lon, dest.lat, dest.lon);
  const raw = ratePerKm(distance);
  const variance = destId ? seededVariance(destId) : 0;
  const mult = BUDGET_MULT[budget] ?? 1.0;
  const price = raw * (1 + variance) * mult;
  // 만원 단위 반올림
  const rounded = Math.round(price / 10000) * 10000;
  return {
    krw: rounded,
    distanceKm: Math.round(distance),
    // 추정 밴드 (±12%) — 대략적 변동 폭 안내용
    lowKrw: Math.round((rounded * 0.88) / 10000) * 10000,
    highKrw: Math.round((rounded * 1.12) / 10000) * 10000,
  };
}
