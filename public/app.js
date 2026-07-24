// WeatherLike 프론트엔드 로직

const form = document.getElementById('travel-form');
const interestsEl = document.getElementById('interests');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const submitBtn = document.getElementById('submit-btn');

const selectedInterests = new Set();

// 관심사 칩을 서버 메타에서 로드 (실패 시 기본값)
const FALLBACK_INTERESTS = [
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

async function loadInterests() {
  let interests = FALLBACK_INTERESTS;
  try {
    const res = await fetch('/api/meta');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.interests) && data.interests.length) interests = data.interests;
    }
  } catch { /* 폴백 사용 */ }

  interestsEl.innerHTML = '';
  for (const it of interests) {
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

    // 매칭 점수 링
    const ring = node.querySelector('.match-ring');
    ring.style.setProperty('--pct', `${r.score}%`);
    node.querySelector('.match-score').textContent = `${r.score}`;

    // 날씨
    const w = r.weather;
    node.querySelector('.weather-metric .metric-emoji').textContent = w.emoji || '🌡️';
    node.querySelector('.weather-temp').textContent =
      w.tempC == null ? '정보 없음' : `${w.tempC}°C`;
    const wDesc = node.querySelector('.weather-desc');
    wDesc.textContent = w.estimated ? `${w.description}` : w.description;
    if (w.estimated) wDesc.classList.add('est');

    // 항공권
    node.querySelector('.fare-price').textContent = formatKRW(r.fare.krw);
    node.querySelector('.fare-range').textContent =
      `추정 · ${formatKRW(r.fare.lowKrw)}~${formatKRW(r.fare.highKrw)} · ${r.fare.distanceKm.toLocaleString('ko-KR')}km`;

    // 추천 이유
    const ul = node.querySelector('.reasons');
    r.reasons.slice(0, 4).forEach((reason) => {
      const li = document.createElement('li');
      li.textContent = reason;
      ul.appendChild(li);
    });

    resultsEl.appendChild(node);
  });

  // 안내 문구
  const originNote = data.origin.requested && !data.origin.resolved
    ? `⚠️ '${data.origin.requested}' 도시를 찾지 못해 <strong>${data.origin.name}</strong> 기준으로 계산했어요. `
    : `출발지: <strong>${data.origin.name}</strong>. `;
  const weatherNote = data.notes.weatherEstimatedFallback
    ? '일부 도시는 실시간 날씨 조회에 실패해 평년 기후 기준 추정값을 표시했습니다. '
    : '';
  setStatus(
    `${originNote}${weatherNote}${data.notes.fareDisclaimer}`,
    data.origin.requested && !data.origin.resolved ? '' : ''
  );
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
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
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 오류 (${res.status})`);
    }
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
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

loadInterests();
