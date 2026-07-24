// ─────────────────────────────────────────────────────────────
//  WeatherLike — Supabase 설정
// ─────────────────────────────────────────────────────────────
//  로그인·저장 기능을 켜려면 아래 두 값을 본인 Supabase 프로젝트 값으로 채우세요.
//  (Supabase 대시보드 → Project Settings → API 에서 확인)
//
//    - SUPABASE_URL      : Project URL   (예: https://abcd1234.supabase.co)
//    - SUPABASE_ANON_KEY : anon public key
//
//  ⚠️ anon key는 "공개용 키"라서 정적 사이트 코드에 넣어도 안전합니다.
//     실제 데이터 보호는 DB의 Row Level Security(RLS)가 담당합니다.
//     (SETUP-SUPABASE.md 참고)
//
//  두 값을 비워두면 로그인/저장 기능은 자동으로 비활성화되고,
//  여행지 추천·날씨·항공권 기능은 그대로 동작합니다.
// ─────────────────────────────────────────────────────────────

window.WEATHERLIKE_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
