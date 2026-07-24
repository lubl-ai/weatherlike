// WeatherLike — 정적(GitHub Pages) 버전
// 백엔드 없이 모든 로직을 브라우저에서 실행한다.
// 날씨/지오코딩은 Open-Meteo(CORS 허용)를 브라우저에서 직접 호출한다.

import { DEFAULT_ORIGIN } from './js/destinations.js';
import { geocodeCity, getCurrentWeather } from './js/weather.js';
import { estimateRoundTripFare } from './js/flights.js';
import { recommend, INTERESTS } from './js/recommender.js';

const form = document.getElementById('travel-form');
const interestsEl = document.getElementById('interests');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const submitBtn = document.getElementById('submit-btn');

const selectedInterests = new Set();

// ── 추천 계산 (기존 server.js의 handleRecommend를 브라우저로 이식) ──
async function getRecommendations(user) {
  let origin = DEFAULT_ORIGIN;
  let originResolved = false;
  if (user.originCity) {
    const geo = await geocodeCity(user.originCity);
    if (geo) {
      origin = { name: geo.name, lat: geo.lat, lon: geo.lon };
      originResolved = true;
    }
  }

  const enrich = async (dest) => {
    const weather = await getCurrentWeather(dest.lat, dest.lon, dest.climate);
    const fare = estimateRoundTripFare(origin, dest, dest.id, user.budget);
    return { weather, fare };
  };

  const results = await recommend(user, enrich, 6);
  const anyEstimatedWeather = results.some((r) => r.weather.estimated);

  return {
    origin: { name: origin.name, resolved: originResolved, requested: user.originCity || null },
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
  };
}

// ── 관심사 칩 렌더링 ──
function buildInterestChips() {
  interestsEl.innerHTML = '';
  for (const it of INTERESTS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = it.label;
    chip.dataset.key = it.key;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      if (selectedInterests.has(it.key)) {
        selectedInterests.delete(it.key);
        chip.classList.remove('selected');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        selectedInterests.add(it.key);
        chip.classList.add('selected');
        chip.setAttribute('aria-pressed', 'true');
      }
    });
    interestsEl.appendChild(chip);
  }
}

function setStatus(html, type) {
  if (!html) {
    statusEl.hidden = true;
    statusEl.className = 'status';
    statusEl.innerHTML = '';
    return;
  }
  statusEl.hidden = false;
  statusEl.className = 'status' + (type ? ` ${type}` : '');
  statusEl.innerHTML = html;
}

function formatKRW(n) {
  if (n == null) return '-';
  if (n >= 10000) {
    const man = n / 10000;
    return `${man % 1 === 0 ? man : man.toFixed(1)}만원`;
  }
  return `${n.toLocaleString('ko-KR')}원`;
}

function renderResults(data) {
  resultsEl.innerHTML = '';
  const tpl = document.getElementById('card-template');

  data.results.forEach((r, idx) => {
    const node = tpl.content.cloneNode(true);
    node.querySelector('.rank').textContent = `#${idx + 1}`;
    node.querySelector('.dest-name').textContent = r.name;
    node.querySelector('.dest-sub').textContent = `${r.country} · ${r.region}`;
    node.querySelector('.blurb').textContent = r.blurb;

    const ring = node.querySelector('.match-ring');
    ring.style.setProperty('--pct', `${r.score}%`);
    node.querySelector('.match-score').textContent = `${r.score}`;

    const w = r.weather;
    node.querySelector('.weather-metric .metric-emoji').textContent = w.emoji || '🌡️';
    node.querySelector('.weather-temp').textContent = w.tempC == null ? '정보 없음' : `${w.tempC}°C`;
    const wDesc = node.querySelector('.weather-desc');
    wDesc.textContent = w.description;
    if (w.estimated) wDesc.classList.add('est');

    node.querySelector('.fare-price').textContent = formatKRW(r.fare.krw);
    node.querySelector('.fare-range').textContent =
      `추정 · ${formatKRW(r.fare.lowKrw)}~${formatKRW(r.fare.highKrw)} · ${r.fare.distanceKm.toLocaleString('ko-KR')}km`;

    const ul = node.querySelector('.reasons');
    r.reasons.slice(0, 4).forEach((reason) => {
      const li = document.createElement('li');
      li.textContent = reason;
      ul.appendChild(li);
    });

    resultsEl.appendChild(node);
  });

  const originNote = data.origin.requested && !data.origin.resolved
    ? `⚠️ '${data.origin.requested}' 도시를 찾지 못해 <strong>${data.origin.name}</strong> 기준으로 계산했어요. `
    : `출발지: <strong>${data.origin.name}</strong>. `;
  const weatherNote = data.notes.weatherEstimatedFallback
    ? '일부 도시는 실시간 날씨 조회에 실패해 평년 기후 기준 추정값을 표시했습니다. '
    : '';
  setStatus(`${originNote}${weatherNote}${data.notes.fareDisclaimer}`);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = {
    originCity: document.getElementById('originCity').value.trim(),
    interests: Array.from(selectedInterests),
    budget: document.getElementById('budget').value,
    climate: document.getElementById('climate').value,
    days: Number(document.getElementById('days').value) || null,
  };

  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-label').textContent = '분석 중…';
  setStatus('<span class="spinner"></span>여행지를 분석하고 현재 날씨·항공권을 조회하고 있어요…');
  resultsEl.innerHTML = '';

  try {
    const data = await getRecommendations(user);
    if (!data.results.length) {
      setStatus('조건에 맞는 여행지를 찾지 못했어요. 조건을 바꿔보세요.', 'error');
    } else {
      renderResults(data);
    }
  } catch (err) {
    setStatus(`❌ ${err.message || '요청 처리 중 문제가 발생했습니다.'}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-label').textContent = '여행지 추천받기';
  }
});

buildInterestChips();
