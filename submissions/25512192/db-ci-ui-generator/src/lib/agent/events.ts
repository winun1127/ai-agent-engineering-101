/**
 * 서버 → 클라이언트 스트림 프로토콜 (JSONL, 한 줄에 JSON 하나).
 *   - 패치 라인:  {"op":"add","path":"/elements/x","value":{...}}   ← json-render SpecStream 그대로
 *   - 사용량:     {"__meta":"usage", ...}                            ← json-render useUIStream 호환
 *   - 에이전트:   {"__meta":"agent", ...}                            ← 이 앱이 추가한 에이전트 진행 이벤트
 */
export type AgentStep = "plan" | "generate" | "validate" | "repair" | "done";

export type AgentEvent = {
  __meta: "agent";
  step: AgentStep;
  status: "start" | "ok" | "issues" | "error" | "info";
  message: string;
  /** 검증 단계의 이슈 목록 */
  issues?: { layer: string; rule: string; elementKey?: string; message: string }[];
  round?: number;
  ms?: number;
};

export type UsageEvent = {
  __meta: "usage";
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export const line = (obj: unknown) => JSON.stringify(obj) + "\n";
