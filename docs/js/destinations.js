// 여행지 데이터셋
// tags: 여행 취향 매칭에 사용
//   beach(해변), city(도시), nature(자연), culture(문화·역사),
//   food(미식), shopping(쇼핑), activity(액티비티), relax(휴양), nightlife(나이트라이프)
// costTier: 현지 물가 등급 (1=저렴, 2=보통, 3=비쌈)
// climate: 날씨 API 실패 시 폴백 추정에 사용
//   summerC/winterC = 해당 도시의 대략적 여름/겨울 평균기온(°C)
//   hemisphere = 'N' 북반구 / 'S' 남반구 (계절 반전 계산용)

export const DESTINATIONS = [
  // ── 동아시아 ──
  { id: 'tokyo', name: '도쿄', country: '일본', region: '동아시아', lat: 35.6762, lon: 139.6503,
    tags: ['city', 'food', 'shopping', 'culture', 'nightlife'], costTier: 3,
    climate: { summerC: 27, winterC: 6, hemisphere: 'N' },
    blurb: '미식 · 쇼핑 · 도시 감성이 모두 완벽한 대도시.' },
  { id: 'osaka', name: '오사카', country: '일본', region: '동아시아', lat: 34.6937, lon: 135.5023,
    tags: ['city', 'food', 'shopping', 'culture'], costTier: 2,
    climate: { summerC: 28, winterC: 6, hemisphere: 'N' },
    blurb: '먹거리 천국. 활기찬 거리와 인심 좋은 분위기.' },
  { id: 'fukuoka', name: '후쿠오카', country: '일본', region: '동아시아', lat: 33.5904, lon: 130.4017,
    tags: ['food', 'city', 'relax', 'nature'], costTier: 2,
    climate: { summerC: 28, winterC: 7, hemisphere: 'N' },
    blurb: '짧은 비행, 라멘과 온천이 있는 가성비 여행지.' },
  { id: 'taipei', name: '타이베이', country: '대만', region: '동아시아', lat: 25.0330, lon: 121.5654,
    tags: ['food', 'city', 'nature', 'culture'], costTier: 1,
    climate: { summerC: 30, winterC: 16, hemisphere: 'N' },
    blurb: '야시장 미식과 온천, 부담 없는 물가.' },
  { id: 'hongkong', name: '홍콩', country: '홍콩', region: '동아시아', lat: 22.3193, lon: 114.1694,
    tags: ['city', 'shopping', 'food', 'nightlife'], costTier: 3,
    climate: { summerC: 29, winterC: 17, hemisphere: 'N' },
    blurb: '화려한 야경과 쇼핑, 딤섬의 도시.' },
  { id: 'shanghai', name: '상하이', country: '중국', region: '동아시아', lat: 31.2304, lon: 121.4737,
    tags: ['city', 'shopping', 'food', 'culture'], costTier: 2,
    climate: { summerC: 30, winterC: 5, hemisphere: 'N' },
    blurb: '전통과 초현대가 공존하는 거대 도시.' },

  // ── 동남아시아 ──
  { id: 'bangkok', name: '방콕', country: '태국', region: '동남아시아', lat: 13.7563, lon: 100.5018,
    tags: ['food', 'city', 'shopping', 'culture', 'nightlife'], costTier: 1,
    climate: { summerC: 32, winterC: 27, hemisphere: 'N' },
    blurb: '길거리 음식과 사원, 저렴한 물가의 매력.' },
  { id: 'phuket', name: '푸켓', country: '태국', region: '동남아시아', lat: 7.8804, lon: 98.3923,
    tags: ['beach', 'relax', 'activity', 'nightlife'], costTier: 1,
    climate: { summerC: 30, winterC: 28, hemisphere: 'N' },
    blurb: '에메랄드빛 바다와 아일랜드 호핑.' },
  { id: 'danang', name: '다낭', country: '베트남', region: '동남아시아', lat: 16.0544, lon: 108.2022,
    tags: ['beach', 'relax', 'food', 'culture'], costTier: 1,
    climate: { summerC: 30, winterC: 22, hemisphere: 'N' },
    blurb: '해변과 고도(古都) 호이안, 뛰어난 가성비.' },
  { id: 'bali', name: '발리', country: '인도네시아', region: '동남아시아', lat: -8.4095, lon: 115.1889,
    tags: ['beach', 'relax', 'nature', 'activity'], costTier: 1,
    climate: { summerC: 28, winterC: 27, hemisphere: 'S' },
    blurb: '요가 · 서핑 · 라이스테라스, 힐링의 섬.' },
  { id: 'singapore', name: '싱가포르', country: '싱가포르', region: '동남아시아', lat: 1.3521, lon: 103.8198,
    tags: ['city', 'food', 'shopping', 'activity'], costTier: 3,
    climate: { summerC: 31, winterC: 27, hemisphere: 'N' },
    blurb: '깔끔한 도시국가, 다국적 미식과 마리나베이.' },
  { id: 'cebu', name: '세부', country: '필리핀', region: '동남아시아', lat: 10.3157, lon: 123.8854,
    tags: ['beach', 'activity', 'relax'], costTier: 1,
    climate: { summerC: 31, winterC: 27, hemisphere: 'N' },
    blurb: '고래상어 스노클링과 리조트 휴양.' },

  // ── 남아시아·중동 ──
  { id: 'dubai', name: '두바이', country: 'UAE', region: '중동', lat: 25.2048, lon: 55.2708,
    tags: ['city', 'shopping', 'activity', 'beach'], costTier: 3,
    climate: { summerC: 40, winterC: 20, hemisphere: 'N' },
    blurb: '사막 사파리와 초고층 랜드마크, 럭셔리 쇼핑.' },

  // ── 오세아니아·태평양 ──
  { id: 'guam', name: '괌', country: '미국(괌)', region: '태평양', lat: 13.4443, lon: 144.7937,
    tags: ['beach', 'relax', 'shopping', 'activity'], costTier: 2,
    climate: { summerC: 30, winterC: 27, hemisphere: 'N' },
    blurb: '가까운 미국령, 물놀이와 면세 쇼핑.' },
  { id: 'sydney', name: '시드니', country: '호주', region: '오세아니아', lat: -33.8688, lon: 151.2093,
    tags: ['city', 'beach', 'nature', 'food'], costTier: 3,
    climate: { summerC: 26, winterC: 13, hemisphere: 'S' },
    blurb: '오페라하우스와 본다이 비치, 자연과 도시의 조화.' },

  // ── 유럽 ──
  { id: 'paris', name: '파리', country: '프랑스', region: '유럽', lat: 48.8566, lon: 2.3522,
    tags: ['city', 'culture', 'food', 'shopping'], costTier: 3,
    climate: { summerC: 25, winterC: 5, hemisphere: 'N' },
    blurb: '예술 · 미식 · 낭만의 대명사.' },
  { id: 'rome', name: '로마', country: '이탈리아', region: '유럽', lat: 41.9028, lon: 12.4964,
    tags: ['culture', 'city', 'food'], costTier: 2,
    climate: { summerC: 30, winterC: 8, hemisphere: 'N' },
    blurb: '고대 유적이 살아있는 야외 박물관.' },
  { id: 'barcelona', name: '바르셀로나', country: '스페인', region: '유럽', lat: 41.3874, lon: 2.1686,
    tags: ['city', 'beach', 'culture', 'food', 'nightlife'], costTier: 2,
    climate: { summerC: 28, winterC: 10, hemisphere: 'N' },
    blurb: '가우디 건축과 해변, 활기찬 밤문화.' },
  { id: 'interlaken', name: '인터라켄', country: '스위스', region: '유럽', lat: 46.6863, lon: 7.8632,
    tags: ['nature', 'activity', 'relax'], costTier: 3,
    climate: { summerC: 18, winterC: 1, hemisphere: 'N' },
    blurb: '알프스 설산과 패러글라이딩, 청량한 자연.' },
  { id: 'santorini', name: '산토리니', country: '그리스', region: '유럽', lat: 36.3932, lon: 25.4615,
    tags: ['beach', 'relax', 'culture'], costTier: 3,
    climate: { summerC: 27, winterC: 12, hemisphere: 'N' },
    blurb: '에게해의 하얀 절벽 마을과 노을.' },
  { id: 'prague', name: '프라하', country: '체코', region: '유럽', lat: 50.0755, lon: 14.4378,
    tags: ['culture', 'city', 'relax'], costTier: 2,
    climate: { summerC: 24, winterC: 0, hemisphere: 'N' },
    blurb: '동화 같은 구시가지와 저렴한 맥주.' },

  // ── 아메리카 ──
  { id: 'newyork', name: '뉴욕', country: '미국', region: '북미', lat: 40.7128, lon: -74.0060,
    tags: ['city', 'shopping', 'culture', 'food', 'nightlife'], costTier: 3,
    climate: { summerC: 28, winterC: 2, hemisphere: 'N' },
    blurb: '세계의 수도, 뮤지컬과 마천루.' },
  { id: 'honolulu', name: '호놀룰루', country: '미국(하와이)', region: '태평양', lat: 21.3069, lon: -157.8583,
    tags: ['beach', 'relax', 'activity', 'nature'], costTier: 3,
    climate: { summerC: 29, winterC: 24, hemisphere: 'N' },
    blurb: '와이키키 해변과 사철 온화한 낙원.' },
  { id: 'cancun', name: '칸쿤', country: '멕시코', region: '중미', lat: 21.1619, lon: -86.8515,
    tags: ['beach', 'relax', 'nightlife', 'activity'], costTier: 2,
    climate: { summerC: 31, winterC: 25, hemisphere: 'N' },
    blurb: '카리브해 백사장과 올인클루시브 리조트.' },
];

// 출발지가 인식되지 않을 때 사용하는 기본 출발 도시 (서울/인천)
export const DEFAULT_ORIGIN = { name: '서울', lat: 37.5665, lon: 126.9780 };
