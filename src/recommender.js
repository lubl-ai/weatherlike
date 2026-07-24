// 여행지 추천 점수 계산
// 입력(사용자 정보)과 각 여행지의 속성을 매칭해 0~100 점수와 추천 이유를 만든다.

import { DESTINATIONS } from './destinations.js';

export const INTERESTS = [
  { key: 'beach', label: '🏖️ 해변·바다' },
  { key: 'city', label: '🏙️ 도시·시티투어' },
  { key: 'nature', label: '🏔️ 자연·풍경' },
  { key: 'culture', label: '🏛️ 문화·역사' },
  { key: 'food', label: '🍜 미식·먹방' },
  { key: 'shopping', label: '🛍️ 쇼핑' },
  { key: 'activity', label: '🤿 액티비티' },
  { key: 'relax', label: '🧘 휴양·힐링' },
  { key: 'nightlife', label: '🌃 나이트라이프' },
];

const INTEREST_LABEL = Object.fromEntries(INTERESTS.map((i) => [i.key, i.label]));

// costTier(1~3)를 예산 등급으로 매핑
const COST_LABEL = { 1: '물가 저렴', 2: '물가 보통', 3: '물가 높음' };

// 사용자 예산 등급별 선호 costTier
function budgetScore(budget, costTier) {
  // low 예산: 저렴한 곳 선호 / high 예산: 어디든 OK
  if (budget === 'low') return [30, 12, 0][costTier - 1];
  if (budget === 'mid') return [22, 30, 15][costTier - 1];
  return [15, 25, 30][costTier - 1]; // high
}

// 선호 기후(warm/cool/any)와 여행지의 현재 추정기온 매칭
function climateScore(prefer, tempC) {
  if (prefer === 'any' || tempC == null) return 12;
  if (prefer === 'warm') {
    if (tempC >= 24) return 24;
    if (tempC >= 18) return 16;
    if (tempC >= 10) return 8;
    return 0;
  }
  // cool
  if (tempC <= 12) return 24;
  if (tempC <= 20) return 16;
  if (tempC <= 26) return 8;
  return 0;
}

// 항공권 예상가가 사용자 예산 성향에 맞는지 (가까울수록 가점)
function fareScore(budget, fareKrw) {
  const k = fareKrw / 10000; // 만원 단위
  if (budget === 'low') {
    if (k <= 40) return 24;
    if (k <= 70) return 14;
    if (k <= 110) return 6;
    return 0;
  }
  if (budget === 'mid') {
    if (k <= 90) return 18;
    if (k <= 150) return 12;
    return 6;
  }
  return 12; // high 예산은 항공료 민감도 낮음
}

// 메인 점수 함수
// user: { interests: string[], budget, climate, origin, days }
// enrich: (dest) => { weather, fare } — 날씨/항공료를 비동기로 주입
export function scoreDestination(user, dest, weather, fare) {
  const reasons = [];
  let score = 0;

  // 1) 관심사 매칭 (최대 40)
  const matched = user.interests.filter((i) => dest.tags.includes(i));
  if (user.interests.length > 0) {
    const ratio = matched.length / user.interests.length;
    score += Math.round(ratio * 40);
    if (matched.length > 0) {
      const labels = matched.map((m) => INTEREST_LABEL[m].replace(/^[^ ]+ /, ''));
      reasons.push(`관심사 일치: ${labels.join(', ')}`);
    }
  } else {
    score += 20; // 관심사 미선택 시 중립 가점
  }

  // 2) 예산(현지 물가) 매칭 (최대 30)
  const bScore = budgetScore(user.budget, dest.costTier);
  score += bScore;

  // 3) 기후 매칭 (최대 24)
  const cScore = climateScore(user.climate, weather?.tempC);
  score += cScore;
  if (user.climate === 'warm' && cScore >= 16) reasons.push('따뜻한 날씨 취향에 잘 맞음');
  if (user.climate === 'cool' && cScore >= 16) reasons.push('선선한 날씨 취향에 잘 맞음');

  // 4) 항공료 매칭 (최대 24)
  const fScore = fareScore(user.budget, fare.krw);
  score += fScore;
  if (user.budget === 'low' && fScore >= 14) reasons.push('항공료 부담이 적은 편');

  // 물가 안내 이유
  reasons.push(COST_LABEL[dest.costTier]);

  // 0~100 정규화 (이론상 최대 118점 → 100으로 클램프)
  const normalized = Math.min(100, Math.round((score / 118) * 100));

  return { score: normalized, reasons };
}

// 전체 여행지에 대해 점수 계산 후 정렬.
// enrich(dest) => Promise<{ weather, fare }> — 날씨/항공료를 병렬로 조회.
export async function recommend(user, enrich, limit = 6) {
  const enriched = await Promise.all(
    DESTINATIONS.map(async (dest) => {
      const { weather, fare } = await enrich(dest);
      const { score, reasons } = scoreDestination(user, dest, weather, fare);
      return { dest, weather, fare, score, reasons };
    })
  );
  enriched.sort((a, b) => b.score - a.score);
  return enriched.slice(0, limit);
}
