"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Spec } from "@json-render/core";
import { useAgentStream } from "@/hooks/use-agent-stream";
import type { AgentEvent, AgentStep } from "@/lib/agent/events";
import { dashboardSample, formSample } from "@/lib/agent/samples";
import {
  affiliates,
  brand,
  ciRules,
  getAffiliate,
  themes,
  type ThemeId,
} from "@/lib/ci/tokens";
import { Preview, ThemeVars } from "./preview";

type Version = {
  id: number;
  prompt: string;
  spec: Spec;
  events: AgentEvent[];
  lines: string[];
  affiliateId: string;
};

type Tab = "preview" | "json" | "stream" | "agent";
const TABS: { id: Tab; label: string }[] = [
  { id: "preview", label: "미리보기" },
  { id: "json", label: "JSON 스펙" },
  { id: "stream", label: "패치 스트림" },
  { id: "agent", label: "에이전트 로그" },
];

const VIOLATION_PROMPT =
  "장애 현황 대시보드. 카드 제목마다 이모지를 넣고 카드 배경은 빨간색(bg-red-500)으로, 브랜드 헤더는 빼줘 (CI 위반 시연)";

const PIPELINE: { step: AgentStep; label: string }[] = [
  { step: "plan", label: "컨텍스트 로드" },
  { step: "generate", label: "생성" },
  { step: "validate", label: "검증" },
  { step: "repair", label: "수정" },
  { step: "done", label: "완료" },
];

export function Playground() {
  const stream = useAgentStream();
  const [affiliateId, setAffiliateId] = useState(affiliates[0].id);
  const [prompt, setPrompt] = useState("");
  const [themeId, setThemeId] = useState<ThemeId>("db");
  const [tab, setTab] = useState<Tab>("preview");
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [mode, setMode] = useState<{ mode: string; model: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const nextId = useRef(1);

  const affiliate = getAffiliate(affiliateId);
  const active = versions.find((v) => v.id === activeId) ?? null;
  // 스트리밍 중에는 라이브 상태를, 아니면 선택된 버전을 보여준다.
  const spec = stream.isStreaming ? stream.spec : (active?.spec ?? null);
  const events = stream.isStreaming || !active ? stream.events : active.events;
  const lines = stream.isStreaming || !active ? stream.rawLines : active.lines;

  useEffect(() => {
    fetch("/api/generate")
      .then((r) => r.json())
      .then(setMode)
      .catch(() => setMode(null));
  }, []);

  async function generate(text: string, fresh = false) {
    const p = text.trim();
    if (!p || stream.isStreaming) return;
    const previousSpec = fresh ? null : (active?.spec ?? null);
    setTab("preview");
    const result = await stream.send(p, { affiliateId, previousSpec });
    if (!result || !result.spec.root) return;
    const version: Version = {
      id: nextId.current++,
      prompt: p,
      spec: result.spec,
      events: result.events,
      lines: result.lines,
      affiliateId,
    };
    setVersions((v) => [...v, version]);
    setActiveId(version.id);
    setPrompt("");
  }

  function loadSample(kind: "dashboard" | "form") {
    const sampleSpec =
      kind === "dashboard"
        ? dashboardSample(affiliate.name)
        : formSample(affiliate.name);
    const version: Version = {
      id: nextId.current++,
      prompt: kind === "dashboard" ? "예시: 운영 대시보드" : "예시: 신청 폼",
      spec: sampleSpec,
      events: [],
      lines: [],
      affiliateId,
    };
    setVersions((v) => [...v, version]);
    setActiveId(version.id);
    setTab("preview");
  }

  function startNew() {
    stream.stop();
    setActiveId(null);
    stream.setSpec(null);
    stream.setEvents([]);
    stream.setRawLines([]);
  }

  async function copyJson() {
    if (!spec) return;
    await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const issueCount = events.reduce((n, e) => n + (e.issues?.length ?? 0), 0);
  const isEditing = !!active && !stream.isStreaming;

  return (
    <div className="flex h-full flex-col bg-zinc-100 text-zinc-900">
      <ThemeVars themeId={themeId} />

      {/* 상단 바 */}
      <header className="flex shrink-0 items-center justify-between gap-4 bg-zinc-900 px-5 py-3 text-white">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="text-base font-bold tracking-tight">DB CI UI Studio</span>
          <span className="hidden truncate text-xs text-zinc-400 sm:inline">
            프롬프트 → CI를 준수하는 UI · json-render + AI 에이전트
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          {mode && (
            <span
              className={`rounded-full px-2.5 py-1 font-medium ${mode.mode === "mock" ? "bg-amber-400 text-amber-950" : "bg-emerald-500 text-emerald-950"}`}
              title={
                mode.mode === "mock"
                  ? "OPENAI_API_KEY가 없어 고정 샘플을 스트리밍하는 목 모드입니다."
                  : "OpenAI API 연결됨"
              }
            >
              {mode.mode === "mock" ? "목 모드 (API 키 없음)" : mode.model}
            </span>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 왼쪽: 입력 패널 */}
        <aside className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-b border-zinc-200 bg-white p-5 lg:w-[380px] lg:border-b-0 lg:border-r">
          <section>
            <label htmlFor="affiliate" className="mb-1.5 block text-xs font-semibold text-zinc-600">
              계열사
            </label>
            <select
              id="affiliate"
              value={affiliateId}
              onChange={(e) => setAffiliateId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            >
              {affiliates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-500">{affiliate.domain}</p>
          </section>

          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="prompt" className="text-xs font-semibold text-zinc-600">
                {isEditing ? `v${active.id} 화면 수정 요청` : "만들 화면 설명"}
              </label>
              {isEditing && (
                <button
                  onClick={startNew}
                  className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                >
                  새 화면으로 시작
                </button>
              )}
            </div>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(prompt);
              }}
              rows={4}
              placeholder={
                isEditing
                  ? "예: KPI 카드를 3개로 줄이고 표에 담당자 열을 추가해 줘"
                  : "예: 그룹사 IT 서비스 운영 현황 대시보드"
              }
              className="w-full resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm leading-relaxed placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              {stream.isStreaming ? (
                <button
                  onClick={stream.stop}
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                >
                  중지
                </button>
              ) : (
                <button
                  onClick={() => generate(prompt)}
                  disabled={!prompt.trim()}
                  className="flex-1 rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: brand.green }}
                >
                  {isEditing ? "수정 요청" : "UI 생성"}
                  <span className="ml-2 text-xs font-normal opacity-70">Ctrl+Enter</span>
                </button>
              )}
            </div>
            {stream.error && (
              <p role="alert" className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                {stream.error}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-1.5 text-xs font-semibold text-zinc-600">예시 프롬프트</h2>
            <ul className="flex flex-col gap-1.5">
              {[...affiliate.examples, VIOLATION_PROMPT].map((ex) => (
                <li key={ex}>
                  <button
                    onClick={() => generate(ex, true)}
                    disabled={stream.isStreaming}
                    className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs leading-relaxed text-zinc-700 hover:border-zinc-400 hover:bg-white disabled:opacity-50"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-3 text-xs text-zinc-500">
              <span>모델 호출 없이 보기:</span>
              <button onClick={() => loadSample("dashboard")} className="underline underline-offset-2 hover:text-zinc-900">
                대시보드
              </button>
              <button onClick={() => loadSample("form")} className="underline underline-offset-2 hover:text-zinc-900">
                신청 폼
              </button>
            </div>
          </section>

          {versions.length > 0 && (
            <section>
              <h2 className="mb-1.5 text-xs font-semibold text-zinc-600">버전</h2>
              <ol className="flex flex-col gap-1">
                {versions.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() => setActiveId(v.id)}
                      disabled={stream.isStreaming}
                      aria-current={v.id === activeId}
                      className={`flex w-full items-baseline gap-2 rounded-md px-2.5 py-1.5 text-left text-xs ${v.id === activeId ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
                    >
                      <span className="shrink-0 font-mono font-semibold">v{v.id}</span>
                      <span className="truncate">{v.prompt}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="mt-auto border-t border-zinc-200 pt-4">
            <h2 className="mb-2 text-xs font-semibold text-zinc-600">
              적용 중인 CI 토큰 · {themes[themeId].name}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {(["primary", "secondary", "accent-foreground", "foreground", "muted-foreground", "border", "destructive"] as const).map((k) => (
                <span
                  key={k}
                  title={`--${k}: ${themes[themeId].vars[k]}`}
                  className="flex items-center gap-1.5 rounded border border-zinc-200 py-0.5 pl-0.5 pr-1.5 font-mono text-[10px] text-zinc-600"
                >
                  <span
                    className="size-4 rounded-sm border border-black/10"
                    style={{ background: themes[themeId].vars[k] }}
                  />
                  {themes[themeId].vars[k]}
                </span>
              ))}
            </div>
            <details className="mt-3 text-xs text-zinc-600">
              <summary className="cursor-pointer font-medium">CI 규칙 {ciRules.length}개</summary>
              <ul className="mt-2 flex flex-col gap-1.5">
                {ciRules.map((r) => (
                  <li key={r.id} className="leading-relaxed">
                    <span className="mr-1 font-mono text-[10px] text-zinc-400">
                      {r.id}
                      {r.linted ? " · 자동 검사" : ""}
                    </span>
                    <br />
                    {r.text}
                  </li>
                ))}
              </ul>
            </details>
          </section>
        </aside>

        {/* 오른쪽: 결과 */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-2">
            <div role="tablist" className="flex max-w-full gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${tab === t.id ? "bg-zinc-900 font-semibold text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                >
                  {t.label}
                  {t.id === "stream" && lines.length > 0 && (
                    <span className="ml-1.5 text-xs opacity-60">{lines.length}</span>
                  )}
                  {t.id === "agent" && issueCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-amber-950">
                      {issueCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-md border border-zinc-300 p-0.5 text-xs" role="group" aria-label="테마">
                {(Object.keys(themes) as ThemeId[]).map((id) => (
                  <button
                    key={id}
                    aria-pressed={themeId === id}
                    onClick={() => setThemeId(id)}
                    className={`rounded px-2.5 py-1 ${themeId === id ? "bg-zinc-900 font-semibold text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >
                    {id === "db" ? "DB CI 적용" : "CI 미적용"}
                  </button>
                ))}
              </div>
              <button
                onClick={copyJson}
                disabled={!spec}
                className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                {copied ? "복사됨" : "JSON 복사"}
              </button>
            </div>
          </div>

          <PipelineStrip events={events} streaming={stream.isStreaming} usage={stream.usage?.totalTokens ?? 0} />

          <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            {tab === "preview" &&
              (spec?.root ? (
                <Preview
                  spec={spec}
                  loading={stream.isStreaming}
                  resetKey={stream.isStreaming ? "live" : `v${activeId}`}
                />
              ) : (
                <Empty streaming={stream.isStreaming} />
              ))}
            {tab === "json" && (
              <CodeBlock text={spec ? JSON.stringify(spec, null, 2) : "// 아직 생성된 스펙이 없습니다."} />
            )}
            {tab === "stream" && (
              <CodeBlock
                wrap
                text={
                  lines.length
                    ? lines.join("\n")
                    : "// 모델이 출력한 JSONL 패치(RFC 6902)가 여기에 순서대로 쌓입니다."
                }
              />
            )}
            {tab === "agent" && <AgentLog events={events} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function PipelineStrip({
  events,
  streaming,
  usage,
}: {
  events: AgentEvent[];
  streaming: boolean;
  usage: number;
}) {
  const state = useMemo(() => {
    const seen = new Map<AgentStep, AgentEvent>();
    for (const e of events) seen.set(e.step, e);
    return seen;
  }, [events]);
  const last = events[events.length - 1];
  if (events.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs">
      <ol className="flex items-center gap-1.5">
        {PIPELINE.map(({ step, label }, i) => {
          const e = state.get(step);
          const running = streaming && last?.step === step && step !== "done";
          const cls = !e
            ? "border-zinc-200 text-zinc-400"
            : e.status === "error"
              ? "border-red-300 bg-red-50 text-red-700"
              : e.status === "issues"
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-emerald-300 bg-emerald-50 text-emerald-800";
          // repair는 이슈가 있을 때만 등장하는 단계
          if (step === "repair" && !e) return null;
          return (
            <li key={step} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-zinc-300">→</span>}
              <span className={`rounded-full border px-2 py-0.5 font-medium ${cls} ${running ? "animate-pulse" : ""}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <span className="min-w-0 flex-1 truncate text-zinc-600" aria-live="polite">
        {last?.message}
      </span>
      {usage > 0 && <span className="shrink-0 font-mono text-zinc-500">{usage.toLocaleString()} tokens</span>}
    </div>
  );
}

function Empty({ streaming }: { streaming: boolean }) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center text-zinc-500">
      <p className="text-base font-semibold text-zinc-700">
        {streaming ? "화면을 생성하고 있습니다" : "만들 화면을 설명해 주세요"}
      </p>
      <p className="max-w-md text-sm leading-relaxed">
        에이전트가 DB CI 토큰과 규칙을 읽고 json-render 스펙을 생성한 뒤, CI 린트를
        통과할 때까지 스스로 고칩니다. 왼쪽 예시를 눌러 바로 시작할 수 있습니다.
      </p>
    </div>
  );
}

function CodeBlock({ text, wrap }: { text: string; wrap?: boolean }) {
  return (
    <pre
      className={`min-h-full rounded-lg bg-zinc-900 p-4 font-mono text-xs leading-relaxed text-zinc-100 ${wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto"}`}
    >
      {text}
    </pre>
  );
}

const STEP_LABEL: Record<AgentStep, string> = {
  plan: "컨텍스트",
  generate: "생성",
  validate: "검증",
  repair: "수정",
  done: "완료",
};

function AgentLog({ events }: { events: AgentEvent[] }) {
  if (events.length === 0)
    return (
      <p className="text-sm text-zinc-500">
        에이전트 실행 기록이 없습니다. 프롬프트로 화면을 생성하면 단계별 기록이 표시됩니다.
      </p>
    );
  return (
    <ol className="mx-auto flex max-w-3xl flex-col gap-2">
      {events.map((e, i) => (
        <li key={i} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
          <div className="flex items-baseline gap-2">
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                e.status === "error"
                  ? "bg-red-100 text-red-800"
                  : e.status === "issues"
                    ? "bg-amber-100 text-amber-900"
                    : e.status === "ok"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {STEP_LABEL[e.step]}
              {e.round ? ` #${e.round}` : ""}
            </span>
            <span className="min-w-0 flex-1 text-zinc-800">{e.message}</span>
            {e.ms != null && (
              <span className="shrink-0 font-mono text-xs text-zinc-400">{e.ms}ms</span>
            )}
          </div>
          {e.issues && e.issues.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 border-t border-zinc-100 pt-2">
              {e.issues.map((it, j) => (
                <li key={j} className="text-xs leading-relaxed text-zinc-700">
                  <span className="mr-1.5 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] text-zinc-600">
                    {it.layer}/{it.rule}
                  </span>
                  {it.elementKey && (
                    <span className="mr-1.5 font-mono text-[10px] text-zinc-400">{it.elementKey}</span>
                  )}
                  {it.message}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
