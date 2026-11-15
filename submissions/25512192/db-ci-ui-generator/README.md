# DB CI UI Studio

프롬프트 한 줄을 **DB그룹 CI를 준수하는 화면**으로 바꾸는 AI 에이전트 기반 UI 생성 서비스.
[json-render](https://json-render.dev) Playground를 벤치마킹했고, 여기에 "CI 자동 반영"과 "스스로 검증·수정하는 에이전트 루프"를 더했다.

- 스택: Next.js 16 (App Router) · json-render 0.22 (`core` / `react` / `shadcn`) · OpenAI Responses API (`gpt-6-luna`) · shadcn/ui (radix-nova) · AI Elements · Tailwind CSS 4
- 용도: DB Inc. 면접 데모

## 실행

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY 입력
npm run dev                  # http://localhost:3000
```

`OPENAI_API_KEY`가 없으면 **목 모드**로 뜬다(우측 상단에 노란 배지). 목 모드는 고정 샘플 스펙을 실제와 같은 JSONL 패치 스트림으로 흘려보내므로, 키 없이도 스트리밍 → 검증 → 수정 → 렌더링 전 과정을 볼 수 있다. 발표장 네트워크가 불안하면 `DEMO_MOCK=1`로 강제할 수 있다.

```bash
npm run test:agent   # 목 모델로 에이전트 루프 3개 시나리오 실행 (키 불필요)
npm run build        # 프로덕션 빌드
```

## 핵심 아이디어: CI를 세 겹으로 강제한다

LLM에게 "DB 색으로 만들어줘"라고 부탁하는 방식은 지켜질 때도 있고 아닐 때도 있다. 이 프로젝트는 CI를 프롬프트가 아니라 **구조**로 강제한다.

| 층 | 무엇이 | 어떻게 |
|---|---|---|
| 1. 카탈로그 | `src/lib/catalog.ts` | 모델은 카탈로그의 24개 컴포넌트만 쓸 수 있고, 컴포넌트에 색상 prop이 없다. 모델이 색을 정할 방법 자체가 없다. |
| 2. 테마 토큰 | `src/lib/ci/tokens.ts` | 색·모서리·서체는 렌더러가 CSS 변수로 주입한다. 같은 스펙이 토큰만 바꾸면 다른 브랜드가 된다 ("CI 미적용" 토글로 비교). 서비스 화면(shadcn/ui) 자체도 같은 토큰으로 칠한다. |
| 3. CI 린트 + 수정 루프 | `src/lib/agent/validate.ts`, `run.ts` | 생성 결과를 규칙으로 기계 검사하고, 위반이 있으면 이슈를 모델에 되먹여 고치게 한다. |

`tokens.ts`가 단일 출처다. 여기 값이 (1) 서비스 화면과 미리보기의 CSS 변수, (2) 시스템 프롬프트의 CI 규칙, (3) 린트 규칙에 동시에 쓰인다.

### 적용한 CI 전용색상

| 이름 | 역할 | HEX | RGB | Pantone |
|---|---|---|---|---|
| DB Green | 메인 컬러 · 로고마크 → `primary` | `#00854A` | R0 G133 B74 | 7732C |
| DB Green Gradient | 생명 | `#8DC63F` ~ `#009559` | R141 G198 B63 ~ R0 G149 B89 | 376C ~ 348C |
| DB Blue Gradient | 물 · 젊음 → 차트 보조색(끝색) | `#14B1E7` ~ `#0061AF` | R20 G177 B231 ~ R0 G97 B175 | 2191C ~ 2133C |
| DB Red Gradient | 태양 → 차트 보조색(시작색), 오류색(끝색) | `#F47920` ~ `#C9252C` | R244 G121 B32 ~ R201 G37 B44 | 158C ~ 2350C |

출처는 DB Inc. "CI 소개"(dbinc.co.kr), DB손해보험 "색상규정"(idbins.com), DB하이텍 CI 페이지에 게시된 값이다. 본문·구분선·옅은 배경 같은 중립색은 CI 값이 아니라 DB Green에서 파생한 UI용 색이다.

## 에이전트 루프

```
plan ─▶ generate ─▶ validate ─┬─ 통과 ─▶ done
              ▲               │
              └── repair ◀────┘   (이슈를 모델에 되먹임, 최대 2회)
```

1. **plan** — 계열사 도메인, 카탈로그, CI 규칙으로 시스템 프롬프트 조립 (`catalog.prompt()` + CI 규칙)
2. **generate** — 모델이 json-render SpecStream(JSONL, RFC 6902 패치)을 출력. 서버는 라인 단위로 검사해 그대로 브라우저에 흘리고, 화면은 패치가 도착하는 대로 채워진다
3. **validate** — LLM 없이 결정적으로 3개 층 검사
   - 구조: 루트·자식 참조 무결성 (`validateSpec`, `autoFixSpec`)
   - 카탈로그: 없는 컴포넌트, 잘못된 props (zod)
   - CI: BrandHeader 1개·첫 자식 / 임의 색상 클래스 금지 / 이모지 금지 / primary 버튼 2개 이하
4. **repair** — 이슈 목록 + 현재 스펙을 모델에 보내 "이 문제만 고치는 최소 패치"를 받는다. 다시 validate로

후속 프롬프트는 현재 화면에 대한 **패치**로 처리된다(전체 재생성 아님). 버전 목록에서 이전 화면으로 돌아갈 수 있다.

## 데모 시나리오 (약 3분)

1. 계열사 `DB Inc.` → 첫 번째 예시 클릭. 화면이 위에서부터 스트리밍으로 채워지는 것을 보여준다.
2. 우측 상단 **CI 미적용** 토글 → 같은 스펙이 뉴트럴 테마로 바뀐다. "스펙에는 색이 없고 CI는 토큰에서 온다"를 설명.
3. **패치 스트림** / **JSON 스펙** 탭 → 모델이 실제로 출력한 것이 코드가 아니라 선언적 JSON임을 보여준다. **CI 가이드** 버튼으로 적용 중인 전용색상과 규칙을 보여준다.
4. 채팅 아래 **CI 위반 시연** 클릭 → 채팅의 에이전트 실행 기록에서 린트가 위반을 잡고, 수정 라운드를 거쳐 통과하는 과정을 보여준다.
5. 채팅에 수정 요청 입력("KPI 카드를 3개로 줄여줘") → 현재 버전에 패치로 반영, 버전이 쌓이고 채팅의 "이 버전 보기"나 버전 선택으로 되돌아갈 수 있다.
6. 계열사를 `DB손해보험`으로 바꿔 사고 접수 화면 생성 → 같은 CI, 다른 업무 맥락.

## 구조

```
src/
  lib/
    ci/tokens.ts        CI 토큰·계열사·CI 규칙 (단일 출처)
    catalog.ts          json-render 카탈로그 (shadcn 20개 + DB 전용 4개: BrandHeader, Metric, BarChart, Steps)
    registry.tsx        카탈로그 → React 컴포넌트
    agent/
      run.ts            에이전트 루프 (async generator)
      prompt.ts         시스템/사용자/수정 프롬프트 조립
      validate.ts       구조 · 카탈로그 · CI 린트
      llm.ts            OpenAI Responses 스트리밍 어댑터 + 목 LLM
      samples.ts        목 모드·예시용 고정 스펙
      events.ts         서버→클라이언트 JSONL 프로토콜
  app/api/generate/route.ts   POST: 에이전트 실행 스트림 / GET: 현재 모드
  hooks/use-agent-stream.ts   스트림 소비 훅 (패치 + 에이전트 이벤트)
  components/playground.tsx   스튜디오 화면: 왼쪽 채팅 패널(AI Elements) + 오른쪽 결과(shadcn/ui Tabs 등)
  components/preview.tsx      json-render Renderer + 테마 변수 주입(미리보기 영역 한정)
  components/ai-elements/     AI Elements: Conversation, Message, PromptInput, Suggestion, Task
  components/ui/              shadcn/ui 컴포넌트
scripts/test-agent.mts        키 없이 도는 에이전트 루프 테스트
```

## 알려진 한계 (면접 전에 확인할 것)

- **CI 아카이브 원본과 직접 대조하지 못했다.** `ci.dbgroup.co.kr/ci-manual/color-usage`는 사이트가 자동화된 요청을 차단해 열 수 없었다. 위 색상값은 계열사 공식 사이트에 게시된 값(검색 결과 기준)이며 DB Green은 세 곳이 일치한다. Blue는 계열사마다 표기가 달라(DB메탈·DB하이텍은 단색 R0 G136 B203 / Pantone 2172C) 발표 전에 아카이브를 브라우저로 열어 `tokens.ts`의 `ciPalette`와 대조할 것. 전용서체·색상 사용 규정(배경색 조합, 금지 사례 등)도 아카이브에서 확인하지 못해 반영하지 않았다.
- **로고는 넣지 않았다.** `BrandHeader`는 계열사명을 텍스트로 표시한다. 공식 로고 파일 사용은 CI 규정 확인 후 `registry.tsx`의 워드마크 자리에 넣는다.
- **실제 OpenAI 호출 경로는 이 저장소 작업 환경에 키가 없어 실행 검증을 못 했다.** 타입체크·빌드는 통과했고 목 모델로 루프 전체를 검증했다. 키를 넣은 뒤 예시 프롬프트 3~4개를 미리 돌려 볼 것.
- 목 모드에서 수정 요청을 보내면 고정 샘플을 기존 화면 위에 덧쓰므로 요소 수가 실제보다 많게 나온다(실제 모델 경로와 무관).
- CI 린트 규칙 4개는 예시 수준이다. "정중한 한국어 문체" 같은 규칙은 프롬프트로만 전달되고 기계 검사는 하지 않는다.
- 생성 화면의 `submit`/`navigate` 액션은 알림만 띄우는 데모 핸들러다.
