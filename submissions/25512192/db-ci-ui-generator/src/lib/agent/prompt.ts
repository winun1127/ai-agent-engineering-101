import { buildUserPrompt, type Spec } from "@json-render/core";
import { catalog } from "../catalog";
import { ciRules, dbTheme, type Affiliate } from "../ci/tokens";

/**
 * 시스템 프롬프트 = json-render가 카탈로그에서 자동 생성한 프롬프트
 *                 + DB CI 규칙(tokens.ts) + 계열사 도메인 컨텍스트.
 * CI 규칙을 코드 한 곳(tokens.ts)에서만 관리하기 위해 여기서 조립한다.
 */
export function buildSystemPrompt(affiliate: Affiliate): string {
  return catalog.prompt({
    system: [
      "당신은 DB그룹의 UI 생성 에이전트입니다.",
      "사용자의 요청을 DB그룹 CI 가이드를 준수하는 화면으로 만들어 json-render 스펙(JSONL 패치)으로 출력합니다.",
      `대상 계열사: ${affiliate.name} — ${affiliate.domain}.`,
    ].join(" "),
    customRules: [
      "DB CI 가이드 (반드시 준수, 출력 후 자동 린트로 검사됨):",
      ...ciRules.map((r) => `[CI:${r.id}] ${r.text}`),
      `BrandHeader의 affiliate prop은 항상 "${affiliate.name}"로 설정한다.`,
      `테마(색상 ${dbTheme.vars.primary}, 모서리 ${dbTheme.vars.radius}, 서체)는 렌더러가 CI 토큰으로 자동 적용하므로 스펙에서 색·폰트를 지정하지 않는다.`,
      "루트는 Stack(direction: vertical, gap: lg)으로 하고, 그 첫 자식이 BrandHeader다.",
      "KPI는 Metric을 Grid에 배치하고, 추이·비교는 BarChart, 절차는 Steps, 목록은 Table을 쓴다.",
      `샘플 데이터는 ${affiliate.name}의 업무 맥락(${affiliate.domain})에 맞는 현실적인 한국어 데이터로 채운다.`,
      "설명 문장, 마크다운, 코드펜스 없이 JSONL 패치 라인만 출력한다.",
    ],
  });
}

export function buildGenerateUserPrompt(
  prompt: string,
  currentSpec: Spec | null,
): string {
  return buildUserPrompt({ prompt, currentSpec, maxPromptLength: 2000 });
}

export function buildRepairUserPrompt(issuesText: string, spec: Spec): string {
  return buildUserPrompt({
    prompt: [
      "방금 생성한 화면을 자동 검증한 결과 아래 문제가 발견되었습니다.",
      "화면의 나머지 부분은 그대로 두고, 아래 문제만 고치는 최소한의 패치를 출력하세요.",
      "",
      issuesText,
    ].join("\n"),
    currentSpec: spec,
  });
}
