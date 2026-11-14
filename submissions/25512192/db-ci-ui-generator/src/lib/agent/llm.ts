import OpenAI from "openai";
import { diffToPatches, type Spec } from "@json-render/core";
import { dashboardSample, formSample, violatingVariant } from "./samples";

export type LlmChunk =
  | { text: string }
  | { usage: { input: number; output: number } };

/** 모델 호출 추상화: (system, user) → 텍스트 델타 스트림. 실제/목 구현을 갈아 끼운다. */
export type Llm = (
  system: string,
  user: string,
  signal?: AbortSignal,
) => AsyncIterable<LlmChunk>;

export const DEFAULT_MODEL = "gpt-6-luna";

export function getModelName(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

/** OpenAI Responses API 스트리밍. */
export function openaiLlm(): Llm {
  const client = new OpenAI(); // OPENAI_API_KEY 환경변수 사용
  const model = getModelName();
  return async function* (system, user, signal) {
    const stream = await client.responses.create(
      { model, instructions: system, input: user, stream: true },
      { signal },
    );
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        yield { text: event.delta };
      } else if (event.type === "response.completed") {
        const usage = event.response.usage;
        if (usage)
          yield { usage: { input: usage.input_tokens, output: usage.output_tokens } };
      } else if (event.type === "response.failed") {
        throw new Error(event.response.error?.message ?? "모델 응답 실패");
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function specToPatchLines(spec: Spec): string[] {
  const lines = [JSON.stringify({ op: "add", path: "/root", value: spec.root })];
  if (spec.state)
    lines.push(JSON.stringify({ op: "add", path: "/state", value: spec.state }));
  // 루트부터 너비 우선으로 내보내 화면이 위에서 아래로 채워지게 한다.
  const queue = [spec.root];
  const seen = new Set<string>();
  while (queue.length) {
    const key = queue.shift()!;
    const el = spec.elements[key];
    if (!el || seen.has(key)) continue;
    seen.add(key);
    lines.push(JSON.stringify({ op: "add", path: `/elements/${key}`, value: el }));
    queue.push(...(el.children ?? []));
  }
  return lines;
}

/**
 * 목 LLM: API 키 없이 파이프라인을 시연·테스트하기 위한 대역.
 * - 프롬프트에 "폼/신청/접수/입력"이 있으면 폼 샘플, 아니면 대시보드 샘플을 스트리밍한다.
 * - 프롬프트에 "위반"이 있으면 CI 위반 변형을 먼저 내보내고, 수정 요청이 오면 고치는 패치를 낸다
 *   (검증 → 수정 루프 시연용).
 */
export function mockLlm(affiliateName: string): Llm {
  let clean: Spec | null = null;
  let dirty: Spec | null = null;
  return async function* (_system, user) {
    const isRepair = user.includes("자동 검증한 결과");
    let lines: string[];
    if (isRepair && clean && dirty) {
      lines = diffToPatches(
        dirty as unknown as Record<string, unknown>,
        clean as unknown as Record<string, unknown>,
      ).map((p) => JSON.stringify(p));
    } else {
      clean = /폼|신청|접수|입력/.test(user)
        ? formSample(affiliateName)
        : dashboardSample(affiliateName);
      dirty = user.includes("위반") ? violatingVariant(clean) : null;
      lines = specToPatchLines(dirty ?? clean);
    }
    let chars = 0;
    for (const l of lines) {
      await sleep(90);
      chars += l.length;
      // 실제 모델처럼 라인 중간에서 청크가 끊기는 상황도 흉내 낸다.
      const cut = Math.floor(l.length / 2);
      yield { text: l.slice(0, cut) };
      yield { text: l.slice(cut) + "\n" };
    }
    yield { usage: { input: 0, output: Math.round(chars / 3) } };
  };
}
