import type { Spec } from "@json-render/core";

/**
 * 목(mock) 모드와 "예시 불러오기"에 쓰는 고정 스펙.
 * OPENAI_API_KEY 없이도 스트리밍 → 검증 → 렌더링 파이프라인 전체를 시연·테스트할 수 있게 한다.
 */

const stack = (
  children: string[],
  direction: "vertical" | "horizontal" = "vertical",
  gap: "sm" | "md" | "lg" = "lg",
  justify: "start" | "between" | "end" | null = null,
) => ({
  type: "Stack",
  props: { direction, gap, align: direction === "vertical" ? "stretch" : "center", justify, className: null },
  children,
});

const card = (title: string, description: string | null, children: string[]) => ({
  type: "Card",
  props: { title, description, maxWidth: "full", centered: null, className: null },
  children,
});

const metric = (
  label: string,
  value: string,
  delta: string | null,
  trend: "up" | "down" | "neutral" | null,
) => ({ type: "Metric", props: { label, value, delta, trend }, children: [] });

export function dashboardSample(affiliate: string): Spec {
  return {
    root: "page",
    elements: {
      page: stack(["header", "kpis", "body", "incidents"]),
      header: {
        type: "BrandHeader",
        props: {
          affiliate,
          title: "IT 서비스 운영 현황",
          subtitle: "2026년 11월 2주차 · 그룹사 통합 기준",
        },
        children: [],
      },
      kpis: {
        type: "Grid",
        props: { columns: 4, gap: "md", className: null },
        children: ["kpi-1", "kpi-2", "kpi-3", "kpi-4"],
      },
      "kpi-1": metric("서비스 가용률", "99.97%", "+0.02%p", "up"),
      "kpi-2": metric("이번 달 장애", "3건", "-2건", "up"),
      "kpi-3": metric("SLA 달성률", "98.4%", "-0.6%p", "down"),
      "kpi-4": metric("평균 복구 시간", "24분", "변동 없음", "neutral"),
      body: {
        type: "Grid",
        props: { columns: 2, gap: "md", className: null },
        children: ["trend-card", "sla-card"],
      },
      "trend-card": card("월별 장애 추이", "최근 6개월", ["trend-chart"]),
      "trend-chart": {
        type: "BarChart",
        props: {
          title: null,
          unit: "건",
          data: [
            { label: "6월", value: 9 },
            { label: "7월", value: 7 },
            { label: "8월", value: 8 },
            { label: "9월", value: 5 },
            { label: "10월", value: 5 },
            { label: "11월", value: 3 },
          ],
        },
        children: [],
      },
      "sla-card": card("계열사별 SLA 달성률", "목표 99.0%", ["sla-stack"]),
      "sla-stack": stack(["sla-1", "sla-2", "sla-3", "sla-note"], "vertical", "md"),
      "sla-1": { type: "Progress", props: { value: 99.6, max: 100, label: "DB손해보험 99.6%" }, children: [] },
      "sla-2": { type: "Progress", props: { value: 98.9, max: 100, label: "DB증권 98.9%" }, children: [] },
      "sla-3": { type: "Progress", props: { value: 96.7, max: 100, label: "DB하이텍 96.7%" }, children: [] },
      "sla-note": {
        type: "Alert",
        props: {
          title: "DB하이텍 SLA 목표 미달",
          message: "MES 연계 배치 지연 2건이 반영되었습니다. 개선 계획을 확인해 주세요.",
          type: "warning",
        },
        children: [],
      },
      incidents: card("최근 인시던트", null, ["incident-table", "incident-actions"]),
      "incident-table": {
        type: "Table",
        props: {
          columns: ["일시", "시스템", "등급", "조치 상태", "복구 시간"],
          rows: [
            ["11.12 09:14", "보상 접수 포털", "2등급", "조치 완료", "18분"],
            ["11.09 22:40", "MES 연계 배치", "3등급", "원인 분석 중", "41분"],
            ["11.03 14:02", "그룹웨어 메일", "3등급", "조치 완료", "13분"],
          ],
          caption: null,
        },
        children: [],
      },
      "incident-actions": stack(["btn-report", "btn-all"], "horizontal", "sm", "end"),
      "btn-all": {
        type: "Button",
        props: { label: "전체 보기", variant: "secondary", disabled: null },
        on: { press: { action: "navigate", params: { to: "/incidents" } } },
        children: [],
      },
      "btn-report": {
        type: "Button",
        props: { label: "주간 보고서 생성", variant: "primary", disabled: null },
        on: { press: { action: "submit", params: { form: "weekly-report" } } },
        children: [],
      },
    },
  } as Spec;
}

export function formSample(affiliate: string): Spec {
  return {
    root: "page",
    state: {
      form: { dept: "", task: "", users: "", grade: "", agree: false },
    },
    elements: {
      page: stack(["header", "steps", "form-card"]),
      header: {
        type: "BrandHeader",
        props: {
          affiliate,
          title: "AI 에이전트 도입 신청",
          subtitle: "신청 내용은 정보보호팀 검토 후 영업일 3일 이내에 안내해 드립니다.",
        },
        children: [],
      },
      steps: {
        type: "Steps",
        props: {
          steps: [
            { title: "신청서 작성", description: "업무·보안 등급 입력" },
            { title: "보안 검토", description: "정보보호팀" },
            { title: "환경 구성", description: "계정·권한 발급" },
            { title: "도입 완료", description: null },
          ],
          current: 0,
        },
        children: [],
      },
      "form-card": card("신청 정보", "모든 항목을 입력해 주세요.", ["form-stack"]),
      "form-stack": stack(["row-1", "task", "grade", "agree", "actions"], "vertical", "md"),
      "row-1": {
        type: "Grid",
        props: { columns: 2, gap: "md", className: null },
        children: ["dept", "users"],
      },
      dept: {
        type: "Select",
        props: {
          label: "신청 부서",
          name: "dept",
          options: ["디지털혁신팀", "IT운영팀", "보상서비스팀", "경영지원팀"],
          placeholder: "부서를 선택해 주세요",
          value: { $bindState: "/form/dept" },
          checks: [{ type: "required", message: "부서를 선택해 주세요." }],
          validateOn: null,
        },
        children: [],
      },
      users: {
        type: "Input",
        props: {
          label: "예상 사용자 수",
          name: "users",
          type: "number",
          placeholder: "예: 30",
          value: { $bindState: "/form/users" },
          checks: [{ type: "required", message: "예상 사용자 수를 입력해 주세요." }],
          validateOn: null,
        },
        children: [],
      },
      task: {
        type: "Textarea",
        props: {
          label: "활용 업무",
          name: "task",
          placeholder: "에이전트를 적용할 업무와 기대 효과를 적어 주세요.",
          rows: 4,
          value: { $bindState: "/form/task" },
          checks: [{ type: "required", message: "활용 업무를 입력해 주세요." }],
          validateOn: null,
        },
        children: [],
      },
      grade: {
        type: "Radio",
        props: {
          label: "데이터 보안 등급",
          name: "grade",
          options: ["공개", "사내 한정", "대외비", "개인정보 포함"],
          value: { $bindState: "/form/grade" },
          checks: null,
          validateOn: null,
        },
        children: [],
      },
      agree: {
        type: "Checkbox",
        props: {
          label: "사내 AI 활용 가이드라인을 확인했으며 이를 준수합니다.",
          name: "agree",
          checked: { $bindState: "/form/agree" },
          checks: null,
          validateOn: null,
        },
        children: [],
      },
      actions: stack(["btn-cancel", "btn-submit"], "horizontal", "sm", "end"),
      "btn-cancel": {
        type: "Button",
        props: { label: "취소", variant: "secondary", disabled: null },
        on: { press: { action: "navigate", params: { to: "/" } } },
        children: [],
      },
      "btn-submit": {
        type: "Button",
        props: { label: "신청하기", variant: "primary", disabled: null },
        on: {
          press: [
            { action: "validateForm", params: { statePath: "/formResult" } },
            { action: "submit", params: { form: "ai-agent-request" } },
          ],
        },
        children: [],
      },
    },
  } as Spec;
}

/**
 * CI 위반을 일부러 심은 변형. 목 모드에서 검증 → 수정 루프를 시연하는 데 쓴다.
 * (BrandHeader 누락, 이모지, 임의 색상 클래스)
 */
export function violatingVariant(clean: Spec): Spec {
  const spec = structuredClone(clean) as Spec;
  const root = spec.elements[spec.root];
  root.children = (root.children ?? []).filter((k) => k !== "header");
  delete spec.elements.header;
  const firstCard = Object.values(spec.elements).find((e) => e.type === "Card");
  if (firstCard) {
    firstCard.props = {
      ...firstCard.props,
      title: `🔥 ${String(firstCard.props.title)}`,
      className: "bg-red-500 text-white",
    };
  }
  return spec;
}
