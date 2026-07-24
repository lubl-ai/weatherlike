import { test } from 'node:test';
import assert from 'node:assert/strict';

import { haversineKm, estimateRoundTripFare } from '../src/flights.js';
import { scoreDestination, recommend, INTERESTS } from '../src/recommender.js';
import { DESTINATIONS, DEFAULT_ORIGIN } from '../src/destinations.js';

test('haversine: 서울-도쿄 거리는 약 1150km', () => {
  const d = haversineKm(37.5665, 126.978, 35.6762, 139.6503);
  assert.ok(d > 1000 && d < 1300, `기대 ~1150km, 실제 ${d}`);
});

test('항공권 추정: 가까운 곳이 먼 곳보다 싸다', () => {
  const tokyo = DESTINATIONS.find((d) => d.id === 'tokyo');
  const paris = DESTINATIONS.find((d) => d.id === 'paris');
  const fT = estimateRoundTripFare(DEFAULT_ORIGIN, tokyo, tokyo.id, 'mid');
  const fP = estimateRoundTripFare(DEFAULT_ORIGIN, paris, paris.id, 'mid');
  assert.ok(fT.krw < fP.krw, `도쿄(${fT.krw}) < 파리(${fP.krw})`);
  assert.ok(fT.krw > 0 && fT.lowKrw < fT.krw && fT.highKrw > fT.krw);
});

test('항공권 추정: 동일 입력은 항상 동일 결과 (결정적)', () => {
  const d = DESTINATIONS[0];
  const a = estimateRoundTripFare(DEFAULT_ORIGIN, d, d.id, 'mid');
  const b = estimateRoundTripFare(DEFAULT_ORIGIN, d, d.id, 'mid');
  assert.equal(a.krw, b.krw);
});

test('점수: 해변 취향 사용자는 해변 여행지에서 높은 점수', () => {
  const bali = DESTINATIONS.find((d) => d.id === 'bali');
  const tokyo = DESTINATIONS.find((d) => d.id === 'tokyo');
  const user = { interests: ['beach', 'relax'], budget: 'low', climate: 'warm' };
  const weather = { tempC: 28 };
  const fare = { krw: 500000 };
  const sBali = scoreDestination(user, bali, weather, fare);
  const sTokyo = scoreDestination(user, tokyo, { tempC: 10 }, { krw: 200000 });
  assert.ok(sBali.score > sTokyo.score, `발리(${sBali.score}) > 도쿄(${sTokyo.score})`);
  assert.ok(sBali.reasons.length > 0);
});

test('점수는 0~100 범위', () => {
  const user = { interests: ['city', 'food', 'shopping'], budget: 'high', climate: 'any' };
  for (const d of DESTINATIONS) {
    const s = scoreDestination(user, d, { tempC: 22 }, { krw: 400000 });
    assert.ok(s.score >= 0 && s.score <= 100, `${d.id}: ${s.score}`);
  }
});

test('recommend: 상위 N개를 점수순으로 반환 (날씨 mock)', async () => {
  const user = { interests: ['beach', 'relax'], budget: 'low', climate: 'warm' };
  const enrich = async (dest) => ({
    weather: { tempC: 27, emoji: '☀️', description: '맑음', estimated: false },
    fare: estimateRoundTripFare(DEFAULT_ORIGIN, dest, dest.id, user.budget),
  });
  const results = await recommend(user, enrich, 5);
  assert.equal(results.length, 5);
  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i - 1].score >= results[i].score, '점수 내림차순이어야 함');
  }
});

test('INTERESTS와 데이터셋 태그 정합성: 모든 태그가 유효한 관심사 키 집합 내에 있진 않아도 됨(추가 태그 허용)', () => {
  const keys = new Set(INTERESTS.map((i) => i.key));
  // 최소한 관심사 키들은 어떤 여행지에서든 존재해야 유용함
  for (const key of keys) {
    const exists = DESTINATIONS.some((d) => d.tags.includes(key));
    assert.ok(exists, `관심사 '${key}'에 해당하는 여행지가 하나도 없음`);
  }
});
