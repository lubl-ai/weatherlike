// WeatherLike — 여행지 추천 · 현재 날씨 · 예상 항공권 웹서비스
// 의존성 없는 순수 Node.js HTTP 서버 (Node 18+ 내장 fetch 사용)

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { DEFAULT_ORIGIN } from './src/destinations.js';
import { geocodeCity, getCurrentWeather } from './src/weather.js';
import { estimateRoundTripFare } from './src/flights.js';
import { recommend, INTERESTS } from './src/recommender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(data);
}

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  // 경로 탈출 방지
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error('payload too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

// 입력값 정리 및 기본값
function normalizeUser(input) {
  const validInterests = new Set(INTERESTS.map((i) => i.key));
  const interests = Array.isArray(input.interests)
    ? input.interests.filter((i) => validInterests.has(i))
    : [];
  const budget = ['low', 'mid', 'high'].includes(input.budget) ? input.budget : 'mid';
  const climate = ['warm', 'cool', 'any'].includes(input.climate) ? input.climate : 'any';
  const originCity = typeof input.originCity === 'string' ? input.originCity.trim() : '';
  const days = Number.isFinite(input.days) ? Math.max(1, Math.min(60, input.days)) : null;
  return { interests, budget, climate, originCity, days };
}

async function handleRecommend(req, res) {
  let input;
  try {
    input = JSON.parse((await readBody(req)) || '{}');
  } catch {
    return sendJson(res, 400, { error: '잘못된 요청 형식입니다.' });
  }
  const user = normalizeUser(input);

  // 출발지 좌표 확인 (실패 시 서울로 폴백)
  let origin = DEFAULT_ORIGIN;
  let originResolved = false;
  if (user.originCity) {
    const geo = await geocodeCity(user.originCity);
    if (geo) {
      origin = { name: geo.name, lat: geo.lat, lon: geo.lon };
      originResolved = true;
    }
  }

  // 각 여행지에 대해 날씨(병렬) + 항공료(로컬 계산) 주입
  const enrich = async (dest) => {
    const [weather] = await Promise.all([
      getCurrentWeather(dest.lat, dest.lon, dest.climate),
    ]);
    const fare = estimateRoundTripFare(origin, dest, dest.id, user.budget);
    return { weather, fare };
  };

  try {
    const results = await recommend(user, enrich, 6);
    const anyEstimatedWeather = results.some((r) => r.weather.estimated);
    sendJson(res, 200, {
      origin: {
        name: origin.name,
        resolved: originResolved,
        requested: user.originCity || null,
      },
      user: { budget: user.budget, climate: user.climate, interests: user.interests, days: user.days },
      results: results.map((r) => ({
        id: r.dest.id,
        name: r.dest.name,
        country: r.dest.country,
        region: r.dest.region,
        blurb: r.dest.blurb,
        tags: r.dest.tags,
        score: r.score,
        reasons: r.reasons,
        weather: r.weather,
        fare: r.fare,
      })),
      notes: {
        weatherEstimatedFallback: anyEstimatedWeather,
        fareDisclaimer: '항공권 가격은 거리 기반 추정값이며 실제 판매가와 다를 수 있습니다.',
      },
    });
  } catch (err) {
    sendJson(res, 500, { error: '추천 처리 중 오류가 발생했습니다.', detail: String(err.message || err) });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/meta') {
    return sendJson(res, 200, { interests: INTERESTS });
  }
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/recommend') {
    return handleRecommend(req, res);
  }
  if (req.method === 'GET') {
    return serveStatic(req, res);
  }
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`WeatherLike 서버 실행 중 → http://localhost:${PORT}`);
});
