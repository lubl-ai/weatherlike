// Open-Meteo 기반 날씨 조회 (무료, API 키 불필요)
//   - geocodeCity(): 도시 이름 → 좌표
//   - getCurrentWeather(): 좌표 → 현재 날씨
// 네트워크 실패 시 destination 데이터셋의 기후 정보로 "추정값"을 반환해 앱이 깨지지 않게 한다.

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 6000;

// WMO weather code → 한글 설명 + 이모지
const WMO = {
  0: ['맑음', '☀️'],
  1: ['대체로 맑음', '🌤️'],
  2: ['부분적으로 흐림', '⛅'],
  3: ['흐림', '☁️'],
  45: ['안개', '🌫️'], 48: ['서리 안개', '🌫️'],
  51: ['약한 이슬비', '🌦️'], 53: ['이슬비', '🌦️'], 55: ['강한 이슬비', '🌦️'],
  56: ['어는 이슬비', '🌧️'], 57: ['강한 어는 이슬비', '🌧️'],
  61: ['약한 비', '🌦️'], 63: ['비', '🌧️'], 65: ['강한 비', '🌧️'],
  66: ['어는 비', '🌧️'], 67: ['강한 어는 비', '🌧️'],
  71: ['약한 눈', '🌨️'], 73: ['눈', '❄️'], 75: ['강한 눈', '❄️'], 77: ['싸락눈', '🌨️'],
  80: ['약한 소나기', '🌦️'], 81: ['소나기', '🌧️'], 82: ['강한 소나기', '⛈️'],
  85: ['약한 눈소나기', '🌨️'], 86: ['강한 눈소나기', '❄️'],
  95: ['천둥번개', '⛈️'], 96: ['우박 동반 뇌우', '⛈️'], 99: ['강한 우박 뇌우', '⛈️'],
};

function describeCode(code) {
  const [text, emoji] = WMO[code] ?? ['정보 없음', '🌡️'];
  return { text, emoji };
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// 도시 이름 → { name, lat, lon } (실패 시 null)
export async function geocodeCity(name) {
  try {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&language=ko&format=json`;
    const data = await fetchJson(url);
    const hit = data?.results?.[0];
    if (!hit) return null;
    return { name: hit.name, lat: hit.latitude, lon: hit.longitude, country: hit.country };
  } catch {
    return null;
  }
}

// 좌표 → 현재 날씨. 실패하면 climateFallback으로 추정값 반환.
export async function getCurrentWeather(lat, lon, climateFallback = null) {
  try {
    const url =
      `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m` +
      `&timezone=auto`;
    const data = await fetchJson(url);
    const cur = data?.current;
    if (!cur) throw new Error('no current');
    const { text, emoji } = describeCode(cur.weather_code);
    return {
      tempC: Math.round(cur.temperature_2m),
      feelsLikeC: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      windKmh: Math.round(cur.wind_speed_10m),
      description: text,
      emoji,
      estimated: false,
    };
  } catch {
    return estimateWeather(climateFallback);
  }
}

// 날씨 API 실패 시: 도시의 기후 프로필 + 현재 월로 대략적 기온 추정
function estimateWeather(climate) {
  if (!climate) {
    return { tempC: null, feelsLikeC: null, humidity: null, windKmh: null,
      description: '정보 없음', emoji: '🌡️', estimated: true };
  }
  const month = new Date().getMonth() + 1; // 1~12
  const { summerC, winterC, hemisphere } = climate;
  // 북반구는 7월이 가장 덥고 1월이 가장 춥다. 남반구는 반대.
  // 계절 위상을 코사인으로 표현: peakMonth에서 최대.
  const peakMonth = hemisphere === 'S' ? 1 : 7;
  const amplitude = (summerC - winterC) / 2;
  const mean = (summerC + winterC) / 2;
  const phase = Math.cos(((month - peakMonth) / 12) * 2 * Math.PI);
  const tempC = Math.round(mean + amplitude * phase);
  return {
    tempC,
    feelsLikeC: tempC,
    humidity: null,
    windKmh: null,
    description: '평년 기후 기준 추정',
    emoji: '🌡️',
    estimated: true,
  };
}
