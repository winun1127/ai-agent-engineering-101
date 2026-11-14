"use client";

import { useCallback, useRef, useState } from "react";
import { createSpecStreamCompiler, type Spec } from "@json-render/core";
import type { AgentEvent, UsageEvent } from "@/lib/agent/events";

export type RunResult = { spec: Spec; events: AgentEvent[]; lines: string[] };

/**
 * /api/generate 의 JSONL 스트림을 읽는 훅.
 * json-render의 useUIStream과 같은 역할이지만, 패치 라인 외에
 * 에이전트 진행 이벤트(__meta: "agent")도 함께 받아 상태로 노출한다.
 */
export function useAgentStream(api = "/api/generate") {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const [usage, setUsage] = useState<UsageEvent | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (
      prompt: string,
      opts: { affiliateId: string; previousSpec: Spec | null },
    ): Promise<RunResult | null> => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const base: Spec = opts.previousSpec?.root
        ? structuredClone(opts.previousSpec)
        : { root: "", elements: {} };
      const compiler = createSpecStreamCompiler<Spec>(structuredClone(base));
      const collectedEvents: AgentEvent[] = [];
      const collectedLines: string[] = [];

      setIsStreaming(true);
      setError(null);
      setEvents([]);
      setRawLines([]);
      setUsage(null);

      const handleLine = (text: string) => {
        if (!text.trim()) return;
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(text);
        } catch {
          return;
        }
        if (parsed.__meta === "agent") {
          const ev = parsed as unknown as AgentEvent;
          collectedEvents.push(ev);
          setEvents([...collectedEvents]);
          if (ev.step === "done" && ev.status === "error") setError(ev.message);
        } else if (parsed.__meta === "usage") {
          setUsage(parsed as unknown as UsageEvent);
        } else {
          collectedLines.push(text);
          const { result } = compiler.push(text + "\n");
          setRawLines([...collectedLines]);
          // 컴파일러가 같은 객체를 변형하므로 React가 변화를 알도록 복제해서 넘긴다.
          setSpec(structuredClone(result));
        }
      };

      try {
        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context: { affiliateId: opts.affiliateId },
            currentSpec: opts.previousSpec,
          }),
          signal: abort.signal,
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(handleLine);
        }
        handleLine(buffer);
        return {
          spec: structuredClone(compiler.getResult()),
          events: collectedEvents,
          lines: collectedLines,
        };
      } catch (err) {
        if ((err as Error).name === "AbortError") return null;
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        if (abortRef.current === abort) setIsStreaming(false);
      }
    },
    [api],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { spec, setSpec, isStreaming, error, events, setEvents, rawLines, setRawLines, usage, send, stop };
}
