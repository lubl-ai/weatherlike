# 로그인 · 저장 기능 켜기 (Supabase 설정)

WeatherLike 정적 사이트에 **로그인**과 **여행지 저장(DB)** 기능을 붙이는 방법입니다.
서버를 따로 운영할 필요 없이, 무료 [Supabase](https://supabase.com) 프로젝트만 있으면 됩니다.

> 이 값들을 채우기 전까지는 로그인/저장 UI가 자동으로 숨겨지고, 여행지 추천·날씨·항공권 기능은 그대로 동작합니다.

---

## 1. Supabase 프로젝트 만들기

1. <https://supabase.com> 가입 후 **New project** 생성 (무료 플랜)
2. 프로젝트가 준비되면 **Project Settings → API** 에서 두 값을 복사:
   - **Project URL** (예: `https://abcd1234.supabase.co`)
   - **anon public** 키

## 2. DB 테이블 + 보안 정책 만들기

Supabase 대시보드 → **SQL Editor** → 아래 SQL을 붙여넣고 **Run**:

```sql
-- 저장 여행지 테이블
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dest_id text not null,
  dest_name text not null,
  country text,
  score int,
  fare_krw int,
  weather_temp int,
  weather_desc text,
  created_at timestamptz not null default now()
);

-- 같은 여행지 중복 저장 방지 (선택)
create unique index if not exists favorites_user_dest_uniq
  on public.favorites (user_id, dest_id);

-- Row Level Security 활성화: 본인 데이터만 접근 가능
alter table public.favorites enable row level security;

create policy "본인 저장만 조회" on public.favorites
  for select using (auth.uid() = user_id);

create policy "본인 저장만 추가" on public.favorites
  for insert with check (auth.uid() = user_id);

create policy "본인 저장만 삭제" on public.favorites
  for delete using (auth.uid() = user_id);
```

> **RLS(행 수준 보안)** 덕분에, 브라우저에 anon 키가 노출돼 있어도 다른 사람의 저장 데이터는 절대 조회/수정할 수 없습니다.

## 3. 로그인 방식 설정

Supabase 대시보드 → **Authentication → Providers**:

- **Email** — 기본 활성화되어 있습니다.
  - 바로 테스트하려면 **Authentication → Sign In / Providers → Email → "Confirm email"** 을 잠시 꺼두면 가입 즉시 로그인됩니다. (운영 시에는 켜두세요.)
- **Google** (선택) — Google provider를 켜고 OAuth 클라이언트를 등록하면 "Google로 계속하기" 버튼이 동작합니다.

**Authentication → URL Configuration** 의 **Site URL** 과 **Redirect URLs** 에 배포 주소를 추가하세요:

```
https://lubl-ai.github.io/weatherlike/
```

(로컬 테스트 시 `http://localhost:8000` 등도 함께 추가)

## 4. 키 입력하기

저장소의 `docs/config.js` 를 열어 두 값을 채우고 커밋하면, 다음 배포 때 로그인/저장이 켜집니다:

```js
window.WEATHERLIKE_CONFIG = {
  SUPABASE_URL: 'https://abcd1234.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...(anon public key)',
};
```

> anon key는 **공개해도 되는 키**입니다(그래서 정적 사이트에 넣어도 안전). 데이터 보호는 위의 RLS가 담당합니다.
> 절대 **service_role** 키는 넣지 마세요 — 그 키는 RLS를 우회하므로 클라이언트에 노출되면 안 됩니다.

## 5. 확인

배포된 사이트에서:
1. 우측 상단 **로그인 / 회원가입** → 이메일로 가입/로그인
2. 여행지 추천 후 카드의 **♥ 저장** 클릭
3. 상단 **♥ 내 저장** 에서 목록 확인·삭제

끝입니다. 🎉
