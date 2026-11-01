# INFOON

연구 및 교육 자료를 한곳에 정리하고, 인용까지 만들어 주는 웹 서비스입니다.

자료가 여러 곳에 흩어져 있어 한눈에 보기 어렵고, 보고서를 쓸 때 인용 관리가 번거롭다는 문제에서 출발했습니다. 자료 정보를 등록하면 프로젝트별로 모아 보고, 필터와 검색으로 찾고, 원하는 양식의 인용을 바로 복사할 수 있습니다.

## 주요 기능

- **자료 관리:** 자료명, 종류, 저장 위치, 중요도, 설명을 등록하고 수정, 삭제합니다.
- **자동 입력:** DOI나 ISBN을 넣으면 제목, 저자, 학술지 등 비어 있는 칸을 채웁니다.
- **검색과 필터:** 제목, 저자, 설명, 학술지, 출판사, 식별자로 검색하고 프로젝트와 종류로 거릅니다.
- **인용 생성:** APA 7, MLA 9, Chicago 17, IEEE 형식으로 인용을 만들어 복사합니다.
- **참고문헌과 내보내기:** 현재 목록의 참고문헌을 정렬해 한 번에 복사하거나 TXT, BibTeX, CSV로 저장합니다.
- **통계:** 중요도별, 종류별, 프로젝트별 자료 수를 보여 줍니다.
- **자료 간 관계:** "A가 B를 인용함", "관련 있음"처럼 자료끼리 연결합니다.
- **프로젝트 관리:** 프로젝트 이름과 목표를 수정하고, 프로젝트를 삭제합니다.
- **읽기 전용 공유:** 링크를 아는 사람이 로그인 없이 프로젝트의 자료 목록을 볼 수 있습니다. 저장 위치는 공개되지 않으며, 링크는 언제든 중지하거나 새로 만들 수 있습니다.

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), React 19, TypeScript |
| 스타일 | Tailwind CSS 4 |
| 백엔드 | Next.js Route Handlers |
| DB와 인증 | Supabase (PostgreSQL, Auth, Row Level Security) |
| 외부 API | doi.org, Open Library |
| 배포 | Vercel |

## 로컬에서 실행하기

Node.js 22 이상과 Supabase 프로젝트가 필요합니다.

1. 패키지를 설치합니다.

   ```bash
   npm install
   ```

2. `.env.example`을 복사해 `.env.local`을 만들고 값을 채웁니다. 값은 Supabase 대시보드의 Project Settings에서 확인합니다.

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```

3. `supabase/migrations/`의 SQL 파일을 번호 순서대로 Supabase SQL Editor에서 실행합니다.

4. Supabase 대시보드의 Authentication → URL Configuration에서 Redirect URLs에 `http://localhost:3000/**`를 추가합니다.

5. 개발 서버를 실행하고 <http://localhost:3000>에 접속합니다.

   ```bash
   npm run dev
   ```

그 밖의 명령은 `npm run lint`(코드 검사), `npm run build`(프로덕션 빌드)입니다.

## 폴더 구조

```
src/
  proxy.ts            모든 요청에서 로그인 세션 갱신
  app/
    page.tsx          메인 화면 (자료 등록, 자료 목록)
    login/ signup/    로그인, 회원가입
    share/[token]/    읽기 전용 공유 페이지
    auth/callback/    이메일 인증 처리
    api/              서버 API
  components/         화면 컴포넌트
  lib/
    materials.ts      자료 타입과 클라이언트 상태 저장소
    materialDb.ts     서버 쪽 입력 검증과 DB 변환
    auth.ts           로그인 상태 관리
    citation.ts       인용 양식 생성
    bibliography.ts   참고문헌 정렬
    exportFormats.ts  BibTeX, CSV 변환
    filterMaterials.ts 검색, 필터, 정렬
    lookup.ts         DOI/ISBN 조회
    supabase/         Supabase 클라이언트
supabase/migrations/  DB 스키마
```

## 데이터 구조

| 테이블 | 내용 |
|---|---|
| `profiles` | 사용자 이름. 계정과 비밀번호는 Supabase Auth가 관리합니다. |
| `projects` | 프로젝트 이름, 목표, 공유 토큰 |
| `materials` | 자료 정보와 인용용 세부 정보 |
| `material_relations` | 자료 간 관계 |

## API

공유 페이지를 제외한 모든 API는 로그인이 필요합니다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET, POST | `/api/materials` | 자료 목록 조회, 등록 |
| PUT, DELETE | `/api/materials/[id]` | 자료 수정, 삭제 |
| GET | `/api/projects` | 프로젝트 목록 조회 |
| PATCH, DELETE | `/api/projects/[id]` | 프로젝트 수정, 삭제 |
| POST, DELETE | `/api/projects/[id]/share` | 공유 링크 생성(재발급), 중지 |
| GET, POST | `/api/relations` | 자료 간 관계 조회, 추가 |
| DELETE | `/api/relations/[id]` | 자료 간 관계 삭제 |
| GET | `/api/lookup?id=` | DOI/ISBN 정보 조회 |

## 보안

- **데이터 접근:** 모든 테이블에 Row Level Security를 적용해 본인 데이터만 읽고 쓸 수 있습니다.
- **공유 페이지:** 비로그인 방문자는 테이블을 직접 읽을 수 없습니다. `get_shared_project` 함수가 토큰이 맞을 때 허용된 컬럼만 돌려줍니다. 공유 페이지는 검색 노출을 막고, 토큰이 외부 사이트로 전달되지 않게 합니다.
- **입력 검증:** 서버에서 자료 입력의 형식과 길이를 검사합니다.
- **외부 조회:** 요청 주소를 고정하고, DOI 리다이렉트는 정해 둔 메타데이터 서버로만 따라갑니다.
- **CSV 내보내기:** 셀 내용이 스프레드시트 수식으로 실행되지 않게 막습니다.

## 배포

1. Vercel에서 이 GitHub 저장소를 import합니다.
2. Environment Variables에 `.env.example`의 두 변수를 넣습니다. 이 값은 브라우저에 공개되도록 설계된 값입니다. `service_role` 같은 비밀 키는 넣지 않습니다.
3. Supabase의 URL Configuration에서 Site URL을 배포 주소로 설정하고, Redirect URLs에 `https://<배포 주소>/**`를 추가합니다.

## 알려진 한계

- Supabase 무료 플랜은 7일간 활동이 없으면 프로젝트를 멈춥니다. 멈추면 로그인과 공유 링크가 동작하지 않으므로 대시보드에서 복구해야 합니다.
- 한국 책의 ISBN 조회는 Open Library 정보가 부정확할 수 있어 결과를 확인해야 합니다.
- 인용은 서식 없는 텍스트라 이탤릭이 적용되지 않습니다. 한글 자료에도 `and`, `et al.` 같은 영어식 표기가 쓰이므로 제출 전에 학교나 학회 양식과 비교해 주세요.
- IEEE 번호는 본문 인용 순서가 아니라 참고문헌 정렬 순서로 붙습니다.
- 공유는 읽기 전용 링크만 지원합니다. 다른 사용자를 초대해 함께 수정하는 기능은 없습니다.
