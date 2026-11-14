import { validateSpec, type Spec } from "@json-render/core";
import type { z } from "zod";
import { catalog } from "../catalog";

/**
 * 에이전트의 "검증 도구". LLM 없이 결정적으로 동작한다.
 * 세 층을 검사한다:
 *   1) structure — json-render 스펙의 구조적 무결성 (root, children 참조 등)
 *   2) catalog   — 카탈로그에 없는 컴포넌트·잘못된 props
 *   3) ci        — DB CI 규칙 (src/lib/ci/tokens.ts 의 ciRules 중 linted 항목)
 */

export type Issue = {
  layer: "structure" | "catalog" | "ci";
  rule: string;
  elementKey?: string;
  message: string;
};

type ComponentDef = { props: z.ZodObject<z.ZodRawShape> };
const components = catalog.data.components as unknown as Record<
  string,
  ComponentDef
>;

const isDynamic = (v: unknown) =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  Object.keys(v).some((k) => k.startsWith("$"));

// 임의 색상 유틸리티: bg-red-500, text-[#fff], border-emerald-300/50 ...
const COLOR_UTILITY =
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|shadow)-(?:\[[^\]]+\]|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d{2,3})?(?:\/\d+)?)(?![\w-])/;
const EMOJI = /\p{Extended_Pictographic}/u;

function collectStrings(value: unknown, out: string[]) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => collectStrings(v, out));
}

function reachable(spec: Spec): string[] {
  const seen: string[] = [];
  const visit = (key: string) => {
    if (seen.includes(key) || !spec.elements[key]) return;
    seen.push(key);
    const el = spec.elements[key];
    (el.children ?? []).forEach(visit);
    Object.values(el.slots ?? {}).forEach((keys) => keys.forEach(visit));
  };
  if (spec.root) visit(spec.root);
  return seen;
}

export function validateStructure(spec: Spec): Issue[] {
  return validateSpec(spec)
    .issues.filter((i) => i.severity === "error")
    .map((i) => ({
      layer: "structure" as const,
      rule: i.code,
      elementKey: i.elementKey,
      message: i.message,
    }));
}

export function validateCatalog(spec: Spec): Issue[] {
  const issues: Issue[] = [];
  for (const [key, el] of Object.entries(spec.elements ?? {})) {
    const def = components[el.type];
    if (!def) {
      issues.push({
        layer: "catalog",
        rule: "unknown_component",
        elementKey: key,
        message: `"${el.type}"은(는) 카탈로그에 없는 컴포넌트입니다. 사용 가능: ${catalog.componentNames.join(", ")}`,
      });
      continue;
    }
    const props = (el.props ?? {}) as Record<string, unknown>;
    for (const [name, propSchema] of Object.entries(def.props.shape)) {
      const value = props[name];
      if (isDynamic(value)) continue; // $state/$bindState 등은 런타임에 해석
      const result = (propSchema as z.ZodType).safeParse(value ?? null);
      if (!result.success && value !== undefined) {
        issues.push({
          layer: "catalog",
          rule: "invalid_prop",
          elementKey: key,
          message: `${el.type}.${name} 값이 올바르지 않습니다: ${result.error.issues[0]?.message ?? "invalid"} (받은 값: ${JSON.stringify(value)?.slice(0, 80)})`,
        });
      } else if (!result.success && value === undefined) {
        issues.push({
          layer: "catalog",
          rule: "missing_prop",
          elementKey: key,
          message: `${el.type}.${name} 은(는) 필수 prop 입니다.`,
        });
      }
    }
  }
  return issues;
}

export function lintCi(spec: Spec): Issue[] {
  const issues: Issue[] = [];
  const keys = reachable(spec);
  const elements = keys.map((k) => [k, spec.elements[k]] as const);

  // brand-header: 정확히 1개, 루트의 첫 번째 자식
  const headers = elements.filter(([, el]) => el.type === "BrandHeader");
  const root = spec.elements[spec.root];
  if (headers.length !== 1) {
    issues.push({
      layer: "ci",
      rule: "brand-header",
      message: `BrandHeader는 화면에 정확히 1개여야 합니다 (현재 ${headers.length}개).`,
    });
  } else if (root && root.type !== "BrandHeader") {
    const first = root.children?.[0];
    if (first !== headers[0][0]) {
      issues.push({
        layer: "ci",
        rule: "brand-header",
        elementKey: headers[0][0],
        message: `BrandHeader("${headers[0][0]}")는 루트 "${spec.root}"의 첫 번째 자식이어야 합니다.`,
      });
    }
  }

  let primaryButtons = 0;
  for (const [key, el] of elements) {
    const props = (el.props ?? {}) as Record<string, unknown>;

    // token-colors-only
    const className = props.className;
    if (typeof className === "string" && COLOR_UTILITY.test(className)) {
      issues.push({
        layer: "ci",
        rule: "token-colors-only",
        elementKey: key,
        message: `className "${className}"에 CI 토큰이 아닌 임의 색상 유틸리티가 있습니다. 색상 클래스를 제거하세요.`,
      });
    }
    if ("style" in props) {
      issues.push({
        layer: "ci",
        rule: "token-colors-only",
        elementKey: key,
        message: "인라인 style prop은 허용되지 않습니다.",
      });
    }

    // no-emoji
    const strings: string[] = [];
    collectStrings(props, strings);
    const withEmoji = strings.find((s) => EMOJI.test(s));
    if (withEmoji) {
      issues.push({
        layer: "ci",
        rule: "no-emoji",
        elementKey: key,
        message: `텍스트 "${withEmoji.slice(0, 40)}"에 이모지가 있습니다. 제거하세요.`,
      });
    }

    if (
      el.type === "Button" &&
      (props.variant == null || props.variant === "primary")
    )
      primaryButtons++;
  }

  // single-primary
  if (primaryButtons > 2) {
    issues.push({
      layer: "ci",
      rule: "single-primary",
      message: `primary 버튼이 ${primaryButtons}개입니다. 핵심 행동 1~2개만 primary로 두고 나머지는 variant를 "secondary"로 바꾸세요.`,
    });
  }
  return issues;
}

export function validateAll(spec: Spec): Issue[] {
  const structure = validateStructure(spec);
  // 구조가 깨졌으면 그 위의 검사는 의미가 없으므로 구조 이슈만 먼저 돌려준다.
  if (structure.length > 0) return structure;
  return [...validateCatalog(spec), ...lintCi(spec)];
}

export function formatIssues(issues: Issue[]): string {
  return issues
    .map(
      (i, n) =>
        `${n + 1}. [${i.layer}/${i.rule}]${i.elementKey ? ` (element "${i.elementKey}")` : ""} ${i.message}`,
    )
    .join("\n");
}
