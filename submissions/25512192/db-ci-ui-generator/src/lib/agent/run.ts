import {
  autoFixSpec,
  createSpecStreamCompiler,
  diffToPatches,
  type Spec,
} from "@json-render/core";
import { catalog } from "../catalog";
import { ciRules, type Affiliate } from "../ci/tokens";
import { line, type AgentEvent, type UsageEvent } from "./events";
import type { Llm } from "./llm";
import {
  buildGenerateUserPrompt,
  buildRepairUserPrompt,
  buildSystemPrompt,
} from "./prompt";
import { formatIssues, validateAll } from "./validate";

export type RunOptions = {
  prompt: string;
  affiliate: Affiliate;
  currentSpec: Spec | null;
  llm: Llm;
  modelLabel: string;
  maxRepairs?: number;
  signal?: AbortSignal;
};

const agent = (e: Omit<AgentEvent, "__meta">) =>
  line({ __meta: "agent", ...e } satisfies AgentEvent);

const emptySpec = (): Spec => ({ root: "", elements: {} });

/**
 * 에이전트 루프.
 *
 *   plan ─▶ generate ─▶ validate ─┬─ 통과 ─▶ done
 *                 ▲               │
 *                 └── repair ◀────┘ (이슈를 모델에 되먹임, 최대 maxRepairs회)
 *
 * 모델 출력(JSONL 패치)은 라인 단위로 검사해 그대로 클라이언트에 흘려보내고,
 * 서버도 같은 패치를 적용해 "지금 화면"을 알고 있다가 생성이 끝나면 검증한다.
 * 출력은 JSONL 문자열(events.ts 프로토콜)의 async generator.
 */
export async function* runAgent(opts: RunOptions): AsyncGenerator<string> {
  const { prompt, affiliate, llm, signal } = opts;
  const maxRepairs = opts.maxRepairs ?? 2;
  const started = Date.now();
  const usage = { input: 0, output: 0 };

  const hasBase = !!opts.currentSpec?.root;
  const compiler = createSpecStreamCompiler<Spec>(
    hasBase ? structuredClone(opts.currentSpec!) : emptySpec(),
  );
  const system = buildSystemPrompt(affiliate);

  yield agent({
    step: "plan",
    status: "info",
    message: `${affiliate.name} · 모델 ${opts.modelLabel} · 카탈로그 컴포넌트 ${catalog.componentNames.length}개 · CI 규칙 ${ciRules.length}개 로드 · ${hasBase ? "기존 화면 수정(패치)" : "새 화면 생성"}`,
  });

  /** 모델을 한 번 호출해 유효한 패치 라인만 적용·전달한다. */
  async function* callModel(user: string): AsyncGenerator<string, number> {
    let buffer = "";
    let applied = 0;
    const handle = (raw: string): string | null => {
      const text = raw.trim();
      if (!text.startsWith("{")) return null; // 코드펜스·설명 문장 방어
      try {
        const patch = JSON.parse(text);
        if (typeof patch.op !== "string" || typeof patch.path !== "string")
          return null;
      } catch {
        return null;
      }
      compiler.push(text + "\n");
      applied++;
      return text + "\n";
    };
    for await (const chunk of llm(system, user, signal)) {
      if ("usage" in chunk) {
        usage.input += chunk.usage.input;
        usage.output += chunk.usage.output;
        continue;
      }
      buffer += chunk.text;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const l of lines) {
        const out = handle(l);
        if (out) yield out;
      }
    }
    const out = handle(buffer);
    if (out) yield out;
    return applied;
  }

  let userPrompt = buildGenerateUserPrompt(prompt, opts.currentSpec);

  for (let round = 0; round <= maxRepairs; round++) {
    const step = round === 0 ? "generate" : "repair";
    const t0 = Date.now();
    yield agent({
      step,
      status: "start",
      round,
      message:
        round === 0
          ? "UI 스펙 생성 중 (JSONL 패치 스트리밍)"
          : `검증 이슈를 모델에 되먹여 수정 중 (${round}/${maxRepairs})`,
    });
    const applied = yield* callModel(userPrompt);
    yield agent({
      step,
      status: "ok",
      round,
      ms: Date.now() - t0,
      message: `패치 ${applied}개 적용`,
    });

    // --- validate ---
    const before = compiler.getResult();
    // 마지막 라운드에서만 손실을 감수하는 자동 수정을 허용한다 (그 전에는 모델이 고치게 둔다).
    const fixed = autoFixSpec(before, { lossy: round === maxRepairs });
    if (fixed.fixes.length > 0) {
      const patches = diffToPatches(
        before as unknown as Record<string, unknown>,
        fixed.spec as unknown as Record<string, unknown>,
      );
      for (const p of patches) {
        const l = JSON.stringify(p) + "\n";
        compiler.push(l);
        yield l;
      }
      yield agent({
        step: "validate",
        status: "info",
        round,
        message: `구조 자동 수정 ${fixed.fixes.length}건: ${fixed.fixes.join("; ")}`,
      });
    }

    const spec = compiler.getResult();
    const issues = validateAll(spec);
    if (issues.length === 0) {
      yield agent({
        step: "validate",
        status: "ok",
        round,
        message: `검증 통과 — 구조 · 카탈로그 · CI 린트 (요소 ${Object.keys(spec.elements).length}개)`,
      });
      break;
    }
    const last = round === maxRepairs;
    yield agent({
      step: "validate",
      status: last ? "error" : "issues",
      round,
      issues,
      message: last
        ? `이슈 ${issues.length}건이 남았지만 수정 한도(${maxRepairs}회)에 도달해 종료합니다`
        : `이슈 ${issues.length}건 발견 → 수정 단계로`,
    });
    if (last) break;
    userPrompt = buildRepairUserPrompt(formatIssues(issues), spec);
  }

  yield line({
    __meta: "usage",
    promptTokens: usage.input,
    completionTokens: usage.output,
    totalTokens: usage.input + usage.output,
  } satisfies UsageEvent);
  yield agent({
    step: "done",
    status: "ok",
    ms: Date.now() - started,
    message: `완료 (${((Date.now() - started) / 1000).toFixed(1)}초)`,
  });
}
