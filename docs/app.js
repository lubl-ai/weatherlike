// WeatherLike — 정적(GitHub Pages) 버전
// 백엔드 없이 모든 로직을 브라우저에서 실행한다.
// 날씨/지오코딩은 Open-Meteo(CORS 허용)를 브라우저에서 직접 호출한다.

import { DEFAULT_ORIGIN } from './js/destinations.js';
import { geocodeCity, getCurrentWeather } from './js/weather.js';
import { estimateRoundTripFare } from './js/flights.js';
import { recommend, INTERESTS } from './js/recommender.js';
import {
  isConfigured, onAuthChange, signInWithEmail, signUpWithEmail,
  signInWithGoogle, signOut, saveFavorite, listFavorites, deleteFavorite,
} from './js/auth.js';

let currentUser = null; // 로그인 사용자 (없으면 null)

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

    // 저장 버튼 (Supabase 설정 시에만 노출)
    const saveBtn = node.querySelector('.btn-save');
    if (isConfigured()) {
      saveBtn.hidden = false;
      saveBtn.addEventListener('click', () => handleSave(r, saveBtn));
    }

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

// ─────────────────────────────────────────────────────────────
//  로그인 / 저장 (Supabase) — 설정된 경우에만 동작
// ─────────────────────────────────────────────────────────────

const authBar = document.getElementById('auth-bar');
const authModal = document.getElementById('auth-modal');
const favModal = document.getElementById('fav-modal');
const favListEl = document.getElementById('fav-list');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');

let authMode = 'signin'; // 'signin' | 'signup'

function toast(msg) {
  // 간단한 상태 표시 재사용
  setStatus(msg);
}

function renderAuthBar() {
  if (!isConfigured()) {
    authBar.hidden = true;
    return;
  }
  authBar.hidden = false;
  authBar.innerHTML = '';
  if (currentUser) {
    const email = currentUser.email || '사용자';
    authBar.innerHTML =
      `<span class="auth-user">👤 ${email}</span>` +
      `<button type="button" class="auth-btn" id="open-fav">♥ 내 저장</button>` +
      `<button type="button" class="auth-btn ghost" id="logout-btn">로그아웃</button>`;
    document.getElementById('open-fav').addEventListener('click', openFavorites);
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await signOut();
    });
  } else {
    authBar.innerHTML =
      `<button type="button" class="auth-btn" id="login-btn">로그인 / 회원가입</button>`;
    document.getElementById('login-btn').addEventListener('click', () => openAuth('signin'));
  }
}

// ── 저장 버튼 핸들러 ──
async function handleSave(resultItem, btn) {
  if (!currentUser) {
    openAuth('signin');
    return;
  }
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = '저장 중…';
  try {
    await saveFavorite(resultItem);
    btn.textContent = '✓ 저장됨';
    btn.classList.add('saved');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = prev;
    alert('저장 실패: ' + (err.message || err));
  }
}

// ── 저장 목록 ──
async function openFavorites() {
  favModal.hidden = false;
  favListEl.innerHTML = '<p class="fav-empty">불러오는 중…</p>';
  try {
    const items = await listFavorites();
    if (!items.length) {
      favListEl.innerHTML = '<p class="fav-empty">아직 저장한 여행지가 없어요. 추천 결과에서 ♥ 저장을 눌러보세요.</p>';
      return;
    }
    favListEl.innerHTML = '';
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'fav-item';
      const temp = it.weather_temp == null ? '' : ` · ${it.weather_temp}°C`;
      const fare = it.fare_krw == null ? '' : ` · 항공권 ${Math.round(it.fare_krw / 10000)}만원`;
      row.innerHTML =
        `<div class="fav-info">` +
        `<strong>${it.dest_name}</strong> <span class="fav-meta">${it.country || ''}${temp}${fare}</span>` +
        `<span class="fav-score">매칭 ${it.score ?? '-'}</span>` +
        `</div>` +
        `<button type="button" class="fav-del" aria-label="삭제">🗑</button>`;
      row.querySelector('.fav-del').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try {
          await deleteFavorite(it.id);
          row.remove();
          if (!favListEl.querySelector('.fav-item')) {
            favListEl.innerHTML = '<p class="fav-empty">저장한 여행지가 없어요.</p>';
          }
        } catch (err) {
          e.target.disabled = false;
          alert('삭제 실패: ' + (err.message || err));
        }
      });
      favListEl.appendChild(row);
    }
  } catch (err) {
    favListEl.innerHTML = `<p class="fav-empty">불러오기 실패: ${err.message || err}</p>`;
  }
}

// ── 로그인 모달 ──
function openAuth(mode) {
  setAuthMode(mode);
  authError.hidden = true;
  authModal.hidden = false;
  document.getElementById('auth-email').focus();
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('auth-title').textContent = isSignup ? '회원가입' : '로그인';
  document.getElementById('auth-submit').textContent = isSignup ? '회원가입' : '로그인';
  document.getElementById('auth-toggle-text').textContent = isSignup ? '이미 계정이 있으신가요?' : '계정이 없으신가요?';
  document.getElementById('auth-toggle-link').textContent = isSignup ? '로그인' : '회원가입';
  document.getElementById('auth-password').autocomplete = isSignup ? 'new-password' : 'current-password';
}

function wireAuthUi() {
  document.getElementById('auth-close').addEventListener('click', () => { authModal.hidden = true; });
  document.getElementById('fav-close').addEventListener('click', () => { favModal.hidden = true; });
  [authModal, favModal].forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; });
  });

  document.getElementById('auth-toggle-link').addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
    authError.hidden = true;
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const submit = document.getElementById('auth-submit');
    submit.disabled = true;
    authError.hidden = true;
    try {
      if (authMode === 'signup') {
        const { needsEmailConfirm } = await signUpWithEmail(email, password);
        if (needsEmailConfirm) {
          authError.hidden = false;
          authError.classList.add('info');
          authError.textContent = '확인 메일을 보냈어요. 메일의 링크를 클릭한 뒤 로그인하세요.';
          setAuthMode('signin');
          return;
        }
      } else {
        await signInWithEmail(email, password);
      }
      authModal.hidden = true;
    } catch (err) {
      authError.hidden = false;
      authError.classList.remove('info');
      authError.textContent = translateAuthError(err);
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById('google-btn').addEventListener('click', async () => {
    try {
      await signInWithGoogle(); // 리다이렉트 발생
    } catch (err) {
      authError.hidden = false;
      authError.textContent = translateAuthError(err);
    }
  });
}

function translateAuthError(err) {
  const msg = String(err?.message || err);
  if (/Invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (/User already registered/i.test(msg)) return '이미 가입된 이메일입니다. 로그인해 주세요.';
  if (/Email not confirmed/i.test(msg)) return '이메일 확인이 필요합니다. 메일함을 확인하세요.';
  if (/Password should be/i.test(msg)) return '비밀번호는 6자 이상이어야 합니다.';
  return msg;
}

// 초기화: 설정돼 있으면 인증 상태 구독
if (isConfigured()) {
  wireAuthUi();
  renderAuthBar(); // 먼저 로그아웃 상태 바를 즉시 표시 (SDK 로딩/실패와 무관하게)
  onAuthChange((user) => {
    currentUser = user;
    renderAuthBar();
    // 로그인 상태 바뀌면 이미 렌더된 저장 버튼 상태도 갱신
    document.querySelectorAll('.btn-save').forEach((b) => {
      if (!b.classList.contains('saved')) { b.disabled = false; b.textContent = '♥ 저장'; }
    });
  }).catch((err) => {
    console.warn('Supabase 인증 초기화 실패:', err);
  });
} else {
  renderAuthBar(); // 미설정 → 숨김
}
