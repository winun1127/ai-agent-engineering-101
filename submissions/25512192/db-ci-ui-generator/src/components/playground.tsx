"use client";

import { useEffect, useRef, useState } from "react";
import type { Spec } from "@json-render/core";
import {
  CheckIcon,
  CircleAlertIcon,
  CopyIcon,
  EyeIcon,
  LoaderCircleIcon,
  PaletteIcon,
  SquarePenIcon,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@/components/ai-elements/task";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAgentStream } from "@/hooks/use-agent-stream";
import type { AgentEvent, AgentStep } from "@/lib/agent/events";
import {
  affiliates,
  ciPalette,
  ciRules,
  getAffiliate,
  type ThemeId,
} from "@/lib/ci/tokens";
import { Preview } from "./preview";

/** 대화의 한 턴: 사용자 요청 1개 + 그에 대한 에이전트 실행 1회. */
type Turn = {
  id: number;
  prompt: string;
  affiliateName: string;
  status: "running" | "done" | "error" | "stopped";
  events: AgentEvent[];
  lines: string[];
  /** 생성에 성공한 경우의 결과 스펙과 버전 번호 */
  spec: Spec | null;
  version: number | null;
  error?: string;
};

const VIOLATION_PROMPT =
  "장애 현황 대시보드. 카드 제목마다 이모지를 넣고 카드 배경은 빨간색(bg-red-500)으로, 브랜드 헤더는 빼줘 (CI 위반 시연)";

const STEP_LABEL: Record<AgentStep, string> = {
  plan: "컨텍스트",
  generate: "생성",
  validate: "검증",
  repair: "수정",
  done: "완료",
};

export function Playground() {
  const stream = useAgentStream();
  const [affiliateId, setAffiliateId] = useState(affiliates[0].id);
  const [input, setInput] = useState("");
  const [themeId, setThemeId] = useState<ThemeId>("db");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [activeVersion, setActiveVersion] = useState<number | null>(null);
  const [mode, setMode] = useState<{ mode: string; model: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const nextId = useRef(1);

  const affiliate = getAffiliate(affiliateId);
  const versions = turns.filter((t) => t.spec && t.version != null);
  const active = versions.find((t) => t.version === activeVersion) ?? null;
  const running = stream.isStreaming;
  // 스트리밍 중에는 라이브 상태를, 아니면 선택된 버전을 보여준다.
  const spec = running ? stream.spec : (active?.spec ?? null);
  const lines = running ? stream.rawLines : (active?.lines ?? []);

  useEffect(() => {
    fetch("/api/generate")
      .then((r) => r.json())
      .then(setMode)
      .catch(() => setMode(null));
  }, []);

  async function generate(text: string, fresh = false) {
    const prompt = text.trim();
    if (!prompt || running) return;
    const id = nextId.current++;
    const previousSpec = fresh ? null : (active?.spec ?? null);
    setInput("");
    setTurns((t) => [
      ...t,
      {
        id,
        prompt,
        affiliateName: affiliate.name,
        status: "running",
        events: [],
        lines: [],
        spec: null,
        version: null,
      },
    ]);

    const result = await stream.send(prompt, { affiliateId, previousSpec });
    const ok = !result.error && !result.aborted && !!result.spec.root;
    setTurns((all) => {
      const version = ok
        ? Math.max(0, ...all.map((t) => t.version ?? 0)) + 1
        : null;
      if (version) setActiveVersion(version);
      return all.map((t) =>
        t.id === id
          ? {
              ...t,
              status: result.aborted ? "stopped" : result.error ? "error" : "done",
              events: result.events,
              lines: result.lines,
              spec: ok ? result.spec : null,
              version,
              error: result.error,
            }
          : t,
      );
    });
  }

  function reset() {
    stream.stop();
    setTurns([]);
    setActiveVersion(null);
    stream.setSpec(null);
  }

  async function copyJson() {
    if (!spec) return;
    await navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const suggestions = [
    ...affiliate.examples.map((p) => ({ label: p.split(/[.(]/)[0], prompt: p })),
    { label: "CI 위반 시연", prompt: VIOLATION_PROMPT },
  ];

  return (
    <div className="flex h-full flex-col bg-muted text-foreground">
      {/* 상단 바 */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-background px-4 py-2.5">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className="text-base font-bold tracking-tight">
            <span className="text-primary">DB</span> CI UI Studio
          </span>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            대화로 만드는 CI 준수 화면 · json-render + AI 에이전트
          </span>
        </div>
        {mode && (
          <Badge
            variant={mode.mode === "mock" ? "outline" : "secondary"}
            title={
              mode.mode === "mock"
                ? "OPENAI_API_KEY가 없어 고정 샘플을 스트리밍하는 목 모드입니다."
                : "OpenAI API 연결됨"
            }
          >
            {mode.mode === "mock" ? "목 모드 · API 키 없음" : mode.model}
          </Badge>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 왼쪽: 채팅 패널 (AI Elements) */}
        <aside className="flex h-[70dvh] w-full shrink-0 flex-col border-b bg-background lg:h-auto lg:w-[420px] lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
            <Select value={affiliateId} onValueChange={setAffiliateId}>
              <SelectTrigger size="sm" className="min-w-0 flex-1" aria-label="계열사">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {affiliates.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={turns.length === 0}
            >
              <SquarePenIcon />새 대화
            </Button>
          </div>

          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="gap-6 p-4">
              {turns.length === 0 ? (
                <ConversationEmptyState
                  icon={<PaletteIcon className="size-8 text-primary" />}
                  title="만들 화면을 설명해 주세요"
                  description={`${affiliate.name} · ${affiliate.domain}. 에이전트가 DB CI 토큰과 규칙을 읽고 화면을 생성한 뒤, CI 린트를 통과할 때까지 스스로 고칩니다.`}
                />
              ) : (
                turns.map((turn) => (
                  <TurnView
                    key={turn.id}
                    turn={turn}
                    liveEvents={turn.status === "running" ? stream.events : null}
                    isActive={turn.version != null && turn.version === activeVersion}
                    onView={() => turn.version && setActiveVersion(turn.version)}
                    disabled={running}
                  />
                ))
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="shrink-0 space-y-2 border-t p-3">
            <Suggestions>
              {suggestions.map((s) => (
                <Suggestion
                  key={s.prompt}
                  suggestion={s.prompt}
                  title={s.prompt}
                  disabled={running}
                  onClick={(p) => generate(p, true)}
                >
                  {s.label}
                </Suggestion>
              ))}
            </Suggestions>
            <PromptInput
              onSubmit={(message: PromptInputMessage) => generate(message.text ?? "")}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    active
                      ? `v${active.version} 화면에 대한 수정 요청 (예: KPI 카드를 3개로 줄여 줘)`
                      : "예: 그룹사 IT 서비스 운영 현황 대시보드"
                  }
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <span className="px-1 text-xs text-muted-foreground">
                    {active
                      ? `v${active.version} 기준으로 수정합니다`
                      : "새 화면을 생성합니다"}
                  </span>
                </PromptInputTools>
                <PromptInputSubmit
                  status={running ? "streaming" : "ready"}
                  onStop={stream.stop}
                  disabled={!running && !input.trim()}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </aside>

        {/* 오른쪽: 결과 */}
        <Tabs defaultValue="preview" className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2">
            <TabsList>
              <TabsTrigger value="preview">미리보기</TabsTrigger>
              <TabsTrigger value="json">JSON 스펙</TabsTrigger>
              <TabsTrigger value="stream">
                패치 스트림
                {lines.length > 0 && (
                  <span className="text-xs text-muted-foreground">{lines.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-2">
              {versions.length > 1 && (
                <Select
                  value={activeVersion ? String(activeVersion) : undefined}
                  onValueChange={(v) => setActiveVersion(Number(v))}
                  disabled={running}
                >
                  <SelectTrigger size="sm" aria-label="버전">
                    <SelectValue placeholder="버전" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((t) => (
                      <SelectItem key={t.id} value={String(t.version)}>
                        v{t.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={themeId}
                onValueChange={(v) => v && setThemeId(v as ThemeId)}
                aria-label="미리보기 테마"
              >
                <ToggleGroupItem value="db" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">DB CI 적용</ToggleGroupItem>
                <ToggleGroupItem value="neutral" className="data-[state=on]:bg-foreground data-[state=on]:text-background">CI 미적용</ToggleGroupItem>
              </ToggleGroup>
              <CiPopover />
              <Button variant="outline" size="sm" onClick={copyJson} disabled={!spec}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "복사됨" : "JSON 복사"}
              </Button>
            </div>
          </div>

          <TabsContent value="preview" className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            {spec?.root ? (
              <Preview
                spec={spec}
                loading={running}
                themeId={themeId}
                resetKey={running ? "live" : `v${activeVersion}`}
              />
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center">
                <p className="text-base font-semibold">
                  {running ? "화면을 생성하고 있습니다" : "아직 생성된 화면이 없습니다"}
                </p>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  왼쪽 채팅에 만들 화면을 설명하거나 예시를 눌러 시작하세요. 생성된
                  화면은 패치가 도착하는 대로 여기에 채워집니다.
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="json" className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            <CodeBlock
              text={spec ? JSON.stringify(spec, null, 2) : "// 아직 생성된 스펙이 없습니다."}
            />
          </TabsContent>
          <TabsContent value="stream" className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
            <CodeBlock
              wrap
              text={
                lines.length
                  ? lines.join("\n")
                  : "// 모델이 출력한 JSONL 패치(RFC 6902)가 여기에 순서대로 쌓입니다."
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/** 채팅의 한 턴: 사용자 말풍선 + 에이전트 실행 과정(Task) + 결과 요약. */
function TurnView({
  turn,
  liveEvents,
  isActive,
  onView,
  disabled,
}: {
  turn: Turn;
  liveEvents: AgentEvent[] | null;
  isActive: boolean;
  onView: () => void;
  disabled: boolean;
}) {
  const events = liveEvents ?? turn.events;
  const issueCount = events.reduce((n, e) => n + (e.issues?.length ?? 0), 0);
  const repaired = events.some((e) => e.step === "repair" && e.status === "ok");
  const elementCount = turn.spec ? Object.keys(turn.spec.elements).length : 0;
  const isRunning = turn.status === "running";

  const title = isRunning
    ? (events[events.length - 1]?.message ?? "에이전트 시작 중")
    : turn.status === "done"
      ? issueCount > 0
        ? `CI 이슈 ${issueCount}건을 발견해 ${repaired ? "수정했습니다" : "보고했습니다"}`
        : "검증 통과"
      : turn.status === "stopped"
        ? "중지됨"
        : "실패";

  return (
    <>
      <Message from="user">
        <MessageContent>{turn.prompt}</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent className="w-full gap-3">
          <Task defaultOpen>
            <TaskTrigger title={title}>
              <div className="flex w-full cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {isRunning ? (
                  <LoaderCircleIcon className="size-4 shrink-0 animate-spin" />
                ) : turn.status === "done" ? (
                  <CheckIcon className="size-4 shrink-0 text-primary" />
                ) : (
                  <CircleAlertIcon className="size-4 shrink-0 text-destructive" />
                )}
                <p className="min-w-0 truncate">{title}</p>
              </div>
            </TaskTrigger>
            <TaskContent>
              {events.map((e, i) => (
                <TaskItem key={i} className="text-xs leading-relaxed">
                  <Badge
                    variant={
                      e.status === "error"
                        ? "destructive"
                        : e.status === "issues"
                          ? "outline"
                          : "secondary"
                    }
                    className="mr-1.5"
                  >
                    {STEP_LABEL[e.step]}
                    {e.round ? ` ${e.round}` : ""}
                  </Badge>
                  {e.message}
                  {e.issues && e.issues.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {e.issues.map((it, j) => (
                        <li key={j} className="text-foreground">
                          <code className="mr-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                            {it.layer}/{it.rule}
                          </code>
                          {it.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </TaskItem>
              ))}
            </TaskContent>
          </Task>

          {turn.status === "done" && turn.version != null && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm">
                {turn.affiliateName} 화면 <strong>v{turn.version}</strong>을 만들었습니다.{" "}
                <span className="text-muted-foreground">요소 {elementCount}개</span>
              </p>
              <Button
                variant={isActive ? "secondary" : "outline"}
                size="xs"
                onClick={onView}
                disabled={disabled || isActive}
              >
                <EyeIcon />
                {isActive ? "보는 중" : "이 버전 보기"}
              </Button>
            </div>
          )}
          {turn.status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {turn.error ?? "화면을 생성하지 못했습니다."}
            </p>
          )}
          {turn.status === "stopped" && (
            <p className="text-sm text-muted-foreground">요청을 중지했습니다.</p>
          )}
        </MessageContent>
      </Message>
    </>
  );
}

/** 적용 중인 CI 전용색상과 규칙을 보여주는 팝오버. */
function CiPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <PaletteIcon />
          CI 가이드
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] space-y-4">
        <section>
          <h3 className="mb-2 text-sm font-semibold">전용색상</h3>
          <ul className="space-y-2">
            {ciPalette.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span
                  className="size-9 shrink-0 rounded-md border"
                  style={{
                    background:
                      c.hex.length > 1
                        ? `linear-gradient(90deg, ${c.hex.join(", ")})`
                        : c.hex[0],
                  }}
                />
                <div className="min-w-0 text-xs leading-relaxed">
                  <div className="font-medium">
                    {c.name}{" "}
                    <span className="font-normal text-muted-foreground">{c.role}</span>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {c.hex.join(" ~ ")} · Pantone {c.pantone}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">생성 규칙 {ciRules.length}개</h3>
          <ul className="space-y-1.5 text-xs leading-relaxed">
            {ciRules.map((r) => (
              <li key={r.id}>
                {r.text}{" "}
                {r.linted && (
                  <Badge variant="secondary" className="ml-0.5">
                    자동 검사
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      </PopoverContent>
    </Popover>
  );
}

function CodeBlock({ text, wrap }: { text: string; wrap?: boolean }) {
  return (
    <pre
      className={`min-h-full rounded-xl border bg-background p-4 font-mono text-xs leading-relaxed ${wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto"}`}
    >
      {text}
    </pre>
  );
}
