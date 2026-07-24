# 🌤️ WeatherLike

내 정보(출발 도시 · 여행 취향 · 예산 · 선호 날씨)를 입력하면 **어울리는 여행지**, **현재 날씨**, **예상 항공권 가격**을 한 번에 추천해주는 웹서비스입니다.

![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen) ![deps](https://img.shields.io/badge/dependencies-0-blue)

## 주요 기능

- **여행지 추천** — 관심사(해변·도시·자연·문화·미식·쇼핑·액티비티·휴양·나이트라이프), 예산 성향, 선호 날씨를 점수화해 25개 인기 여행지 중 상위 6곳을 매칭합니다. 각 추천에는 **왜 추천됐는지** 이유가 함께 표시됩니다.
- **현재 날씨** — [Open-Meteo](https://open-meteo.com/) API로 각 여행지의 실시간 기온·날씨를 조회합니다. (무료, API 키 불필요)
- **예상 항공권 가격** — 출발지↔여행지 거리(하버사인)를 기반으로 왕복 항공권 가격을 추정합니다.

## 빠른 시작

```bash
# 의존성 설치 불필요 — 순수 Node.js로 동작합니다
node server.js

# 또는
npm start
```

브라우저에서 <http://localhost:3000> 접속.

포트 변경: `PORT=8080 node server.js`

## 프로젝트 구조

```
weatherlike/
├── server.js              # 의존성 없는 HTTP 서버 + API
├── src/
│   ├── destinations.js    # 여행지 데이터셋(좌표·태그·기후·물가)
│   ├── recommender.js     # 취향/예산/기후 매칭 점수 로직
│   ├── flights.js         # 거리 기반 항공권 추정 (하버사인)
│   └── weather.js         # Open-Meteo 연동 + 폴백 추정
├── public/                # 프론트엔드 (HTML/CSS/JS, 빌드 불필요)
└── test/                  # node:test 스모크 테스트
```

## API

### `POST /api/recommend`

요청:

```json
{
  "originCity": "서울",
  "interests": ["beach", "relax", "food"],
  "budget": "low",
  "climate": "warm",
  "days": 5
}
```

- `budget`: `"low"` | `"mid"` | `"high"`
- `climate`: `"warm"` | `"cool"` | `"any"`
- `interests`: `beach, city, nature, culture, food, shopping, activity, relax, nightlife` 중 복수

응답(요약):

```json
{
  "origin": { "name": "서울", "resolved": true },
  "results": [
    {
      "name": "다낭", "country": "베트남", "score": 100,
      "reasons": ["관심사 일치: 해변·바다, 휴양·힐링", "..."],
      "weather": { "tempC": 30, "description": "맑음", "emoji": "☀️", "estimated": false },
      "fare": { "krw": 370000, "lowKrw": 320000, "highKrw": 410000, "distanceKm": 3019 }
    }
  ],
  "notes": { "fareDisclaimer": "항공권 가격은 거리 기반 추정값이며..." }
}
```

### `GET /api/meta`

관심사 목록을 반환합니다 (프론트엔드 칩 렌더링용).

## 테스트

```bash
npm test   # node --test
```

## 참고 사항

- **항공권 가격은 추정값입니다.** 실제 항공사 예약 API(Amadeus 등)는 API 키·유료 계약이 필요하므로, 본 서비스는 거리 기반 모델로 대략적인 왕복 요금을 계산합니다. 실제 판매가와 다를 수 있으며 UI에도 "추정" 라벨을 표시합니다.
- **날씨 폴백** — 네트워크 문제 등으로 Open-Meteo 조회에 실패하면 각 여행지의 평년 기후 데이터로 현재 월 기준 추정 기온을 계산해 표시합니다(이 경우 "평년 기후 기준 추정"으로 표기).
- **런타임 의존성 0** — Node.js 18+ 내장 기능(`http`, `fetch`)만 사용합니다. `npm install` 없이 바로 실행됩니다.

## 향후 확장 아이디어

- Amadeus/Skyscanner 등 실제 항공권 API 연동 (환경변수로 API 키 주입)
- 여행지 데이터셋 확장 및 사용자 즐겨찾기/저장
- 여행 기간(days)을 반영한 총 예상 경비 계산
