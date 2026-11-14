import type { Spec } from "@json-render/core";
import { getAffiliate } from "@/lib/ci/tokens";
import { line } from "@/lib/agent/events";
import { getModelName, mockLlm, openaiLlm } from "@/lib/agent/llm";
import { runAgent } from "@/lib/agent/run";

export const maxDuration = 120;

/**
 * POST /api/generate
 * body: { prompt: string, context?: { affiliateId?: string }, currentSpec?: Spec }
 * 응답: JSONL 스트림 (src/lib/agent/events.ts 참고)
 *
 * OPENAI_API_KEY가 없거나 DEMO_MOCK=1이면 목 LLM으로 동작한다.
 */
export async function POST(req: Request) {
  let body: {
    prompt?: unknown;
    context?: { affiliateId?: string };
    currentSpec?: Spec | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 JSON 본문입니다." }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "prompt가 비어 있습니다." }, { status: 400 });
  }

  const affiliate = getAffiliate(body.context?.affiliateId);
  const useMock = process.env.DEMO_MOCK === "1" || !process.env.OPENAI_API_KEY;
  const llm = useMock ? mockLlm(affiliate.name) : openaiLlm();
  const currentSpec = body.currentSpec?.root ? body.currentSpec : null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of runAgent({
          prompt,
          affiliate,
          currentSpec,
          llm,
          modelLabel: useMock ? "mock (API 키 없음)" : getModelName(),
          signal: req.signal,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        if (!req.signal.aborted) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[generate]", err);
          controller.enqueue(
            encoder.encode(
              line({
                __meta: "agent",
                step: "done",
                status: "error",
                message: `모델 호출 실패: ${message}`,
              }),
            ),
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Agent-Mode": useMock ? "mock" : "openai",
    },
  });
}

/** 클라이언트가 현재 모드(모델명 / 목 여부)를 표시하는 데 쓴다. */
export async function GET() {
  const useMock = process.env.DEMO_MOCK === "1" || !process.env.OPENAI_API_KEY;
  return Response.json({ mode: useMock ? "mock" : "openai", model: getModelName() });
}
