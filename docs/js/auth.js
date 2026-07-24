// Supabase 인증 + 저장(DB) 헬퍼
// - 설정(config.js)이 비어 있으면 isConfigured()가 false를 반환하고,
//   앱은 로그인/저장 UI를 비활성화한 채 기본 기능만 제공한다.
// - Supabase SDK는 설정이 있을 때만 CDN에서 동적 import 한다
//   (미설정/오프라인 환경에서 앱이 깨지지 않도록).

const CFG = (typeof window !== 'undefined' && window.WEATHERLIKE_CONFIG) || {};
const SUPABASE_URL = (CFG.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (CFG.SUPABASE_ANON_KEY || '').trim();

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let _clientPromise = null;

// Supabase 클라이언트를 (한 번만) 생성. 미설정이면 null.
async function getClient() {
  if (!isConfigured()) return null;
  if (!_clientPromise) {
    _clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
      .then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true },
        })
      );
  }
  return _clientPromise;
}

// ── 인증 ──

export async function getUser() {
  const sb = await getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data?.user ?? null;
}

// 로그인 상태 변화 구독. callback(user|null)
export async function onAuthChange(callback) {
  const sb = await getClient();
  if (!sb) return () => {};
  const { data: { user } } = await sb.auth.getUser();
  callback(user ?? null);
  const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => sub?.subscription?.unsubscribe?.();
}

export async function signUpWithEmail(email, password) {
  const sb = await getClient();
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다.');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  // 이메일 확인이 켜져 있으면 session이 없다 → 확인 메일 안내 필요
  return { user: data.user, needsEmailConfirm: !data.session };
}

export async function signInWithEmail(email, password) {
  const sb = await getClient();
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다.');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signInWithGoogle() {
  const sb = await getClient();
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다.');
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  const sb = await getClient();
  if (!sb) return;
  await sb.auth.signOut();
}

// ── 저장(favorites 테이블) ──

// 여행지 저장. item: 추천 결과 카드 객체
export async function saveFavorite(item) {
  const sb = await getClient();
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다.');
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');

  const row = {
    user_id: user.id,
    dest_id: item.id,
    dest_name: item.name,
    country: item.country ?? null,
    score: item.score ?? null,
    fare_krw: item.fare?.krw ?? null,
    weather_temp: item.weather?.tempC ?? null,
    weather_desc: item.weather?.description ?? null,
  };
  const { data, error } = await sb.from('favorites').insert(row).select().single();
  if (error) throw error;
  return data;
}

// 내 저장 목록 (최신순)
export async function listFavorites() {
  const sb = await getClient();
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다.');
  const { data, error } = await sb
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteFavorite(id) {
  const sb = await getClient();
  if (!sb) throw new Error('Supabase가 설정되지 않았습니다.');
  const { error } = await sb.from('favorites').delete().eq('id', id);
  if (error) throw error;
}
