# Supabase 연결 및 운영 메모

## 적용된 구성

- `guestbook_entries`: 공개 방명록
- `game_scores`: 공개 테트리스 랭킹
- 두 테이블 모두 RLS 활성화
- 공개 사용자는 조회와 추가만 가능
- 수정과 삭제는 공개되지 않음

브라우저는 `supabase-config.js`의 Project URL과 Publishable key를 사용한다. Publishable key는 공개 웹 앱용 키이며, 실제 데이터 권한은 RLS가 제한한다.

## 주의사항

- `.env`의 `SUPABASE_ACCESS_TOKEN`은 관리용 비밀 값이다. 브라우저 코드나 Git에 포함하지 않는다.
- Secret key와 `service_role` 키도 브라우저에 포함하지 않는다.
- 기존 `localStorage`의 데이터는 사용자의 동의 없이 자동 업로드하지 않는다.
- 로그인 없는 공개 쓰기 기능이므로 스팸이 발생하면 CAPTCHA와 Edge Function 기반 요청 제한을 추가한다.
- 게임은 브라우저에서 실행되므로 점수 조작을 완전히 막을 수 없는 캐주얼 랭킹이다.

## 데이터 표시 범위

- 방명록: 최신 50개
- 게임: 상위 20개를 조회하고 화면에는 TOP 5 표시

## 수동 재적용

DB 구성을 다시 적용해야 할 때는 Supabase Dashboard의 SQL Editor에서 `supabase-schema.sql`을 실행한다. SQL은 여러 번 실행해도 같은 정책과 권한 상태가 되도록 작성되어 있다.
