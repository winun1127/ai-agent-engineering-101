/**
 * DB그룹 CI 디자인 토큰 — 이 파일이 CI의 단일 출처(single source of truth)다.
 *
 * 여기 값은 (1) 미리보기의 CSS 변수, (2) 에이전트 시스템 프롬프트의 CI 규칙,
 * (3) CI 린트 규칙 세 곳에 동시에 쓰인다. 값을 바꾸면 세 곳이 함께 바뀐다.
 *
 * 주의: 아래 색상 hex는 공개된 DB 로고의 그린 계열을 눈으로 맞춘 "근사값"이다.
 * 공식 CI 매뉴얼의 전용색상(Pantone/CMYK/RGB)을 확보하면 `brand` 블록만 교체하면 된다.
 */

export type ThemeVars = {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
  "chart-1": string;
  "chart-2": string;
  "chart-3": string;
  "font-brand": string;
};

export type CiTheme = {
  id: "db" | "neutral";
  name: string;
  description: string;
  vars: ThemeVars;
};

/** 브랜드 원색. 공식 값 확보 시 이 블록만 교체. */
export const brand = {
  green: "#00854A", // DB Green (근사값)
  greenDark: "#006B3C", // hover / 강조
  greenTint: "#E6F4EC", // 옅은 배경
  ink: "#1A1F1C", // 본문 텍스트
  gray: "#5F6B64", // 보조 텍스트
  line: "#DCE3DE", // 구분선
  surface: "#F6F8F7", // 페이지 배경
  alert: "#C8102E", // 오류/위험
} as const;

const systemFont =
  '"Pretendard Variable", Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

export const dbTheme: CiTheme = {
  id: "db",
  name: "DB CI",
  description: "DB그룹 CI 토큰 적용",
  vars: {
    background: "#FFFFFF",
    foreground: brand.ink,
    card: "#FFFFFF",
    "card-foreground": brand.ink,
    popover: "#FFFFFF",
    "popover-foreground": brand.ink,
    primary: brand.green,
    "primary-foreground": "#FFFFFF",
    secondary: brand.greenTint,
    "secondary-foreground": brand.greenDark,
    muted: brand.surface,
    "muted-foreground": brand.gray,
    accent: brand.greenTint,
    "accent-foreground": brand.greenDark,
    destructive: brand.alert,
    border: brand.line,
    input: brand.line,
    ring: brand.green,
    radius: "0.375rem",
    "chart-1": brand.green,
    "chart-2": "#5FB58A",
    "chart-3": "#B5DCC6",
    "font-brand": systemFont,
  },
};

/** CI 미적용 비교용: shadcn 기본 뉴트럴 테마. */
export const neutralTheme: CiTheme = {
  id: "neutral",
  name: "기본(CI 미적용)",
  description: "shadcn 기본 뉴트럴",
  vars: {
    background: "#FFFFFF",
    foreground: "#0A0A0A",
    card: "#FFFFFF",
    "card-foreground": "#0A0A0A",
    popover: "#FFFFFF",
    "popover-foreground": "#0A0A0A",
    primary: "#171717",
    "primary-foreground": "#FAFAFA",
    secondary: "#F5F5F5",
    "secondary-foreground": "#171717",
    muted: "#F5F5F5",
    "muted-foreground": "#737373",
    accent: "#F5F5F5",
    "accent-foreground": "#171717",
    destructive: "#E7000B",
    border: "#E5E5E5",
    input: "#E5E5E5",
    ring: "#A1A1A1",
    radius: "0.625rem",
    "chart-1": "#171717",
    "chart-2": "#737373",
    "chart-3": "#D4D4D4",
    "font-brand": "system-ui, sans-serif",
  },
};

export const themes = { db: dbTheme, neutral: neutralTheme } as const;
export type ThemeId = keyof typeof themes;

/** 테마 토큰을 CSS 변수 맵으로 변환 (`--primary: #00854A` ...). */
export function themeToCssVars(theme: CiTheme): Record<string, string> {
  return Object.fromEntries(
    Object.entries(theme.vars).map(([k, v]) => [`--${k}`, v]),
  );
}

export type Affiliate = {
  id: string;
  name: string;
  domain: string;
  examples: string[];
};

/** 계열사별 도메인 컨텍스트. 같은 CI를 공유하되 화면의 업무 맥락만 달라진다. */
export const affiliates: Affiliate[] = [
  {
    id: "db-inc",
    name: "DB Inc.",
    domain: "IT 서비스·시스템 통합(SI)·IT 아웃소싱, 그룹 IT 운영",
    examples: [
      "그룹사 IT 서비스 운영 현황 대시보드. 가용률·장애 건수·SLA 달성률 KPI와 월별 장애 추이 차트, 최근 인시던트 표",
      "사내 AI 에이전트 도입 신청 폼. 부서, 활용 업무, 예상 사용자 수, 보안 등급 선택과 제출 버튼",
      "프로젝트 진행 현황 화면. 단계 표시와 프로젝트별 진척률, 리스크 알림",
    ],
  },
  {
    id: "db-insurance",
    name: "DB손해보험",
    domain: "손해보험(자동차·장기·일반보험), 보상 청구",
    examples: [
      "자동차보험 사고 접수 화면. 접수 단계 표시, 사고 일시·장소·내용 입력, 접수 버튼",
      "내 보험 계약 조회 화면. 계약 요약 KPI와 계약 목록 표, 보험금 청구 버튼",
    ],
  },
  {
    id: "db-life",
    name: "DB생명",
    domain: "생명보험, 연금, 보장 분석",
    examples: [
      "보장 분석 결과 화면. 보장 영역별 충족도 진행 막대와 추천 상품 카드",
    ],
  },
  {
    id: "db-securities",
    name: "DB증권",
    domain: "증권 위탁매매, 자산관리, 투자 정보",
    examples: [
      "자산 현황 대시보드. 총자산·평가손익·수익률 KPI, 자산군별 비중 차트, 보유 종목 표",
    ],
  },
  {
    id: "db-hitek",
    name: "DB하이텍",
    domain: "시스템반도체 파운드리, 생산·품질 관리",
    examples: [
      "팹 생산 현황 대시보드. 라인별 가동률, 수율 KPI, 공정별 WIP 차트, 설비 알람 목록",
    ],
  },
];

export function getAffiliate(id: string | undefined): Affiliate {
  return affiliates.find((a) => a.id === id) ?? affiliates[0];
}

/**
 * CI 가이드 규칙. 시스템 프롬프트에 그대로 주입되고,
 * `id`가 있는 규칙은 src/lib/agent/validate.ts 의 린트가 기계적으로 검사한다.
 */
export const ciRules: { id: string; text: string; linted: boolean }[] = [
  {
    id: "brand-header",
    text: "모든 화면은 BrandHeader 컴포넌트 정확히 1개로 시작한다 (루트 컨테이너의 첫 번째 자식).",
    linted: true,
  },
  {
    id: "token-colors-only",
    text: "색상은 CI 토큰으로만 표현한다. className에 임의 색상 유틸리티(bg-red-500, text-[#123456] 등)나 인라인 색상값을 쓰지 않는다. 강조는 Button/Badge의 variant로 표현한다.",
    linted: true,
  },
  {
    id: "no-emoji",
    text: "금융·IT 그룹의 신뢰감 있는 톤을 유지한다. 텍스트에 이모지를 쓰지 않는다.",
    linted: true,
  },
  {
    id: "single-primary",
    text: "한 화면에서 기본(primary) 버튼은 핵심 행동 1~2개에만 쓰고 나머지는 secondary/outline variant를 쓴다.",
    linted: true,
  },
  {
    id: "korean-formal",
    text: "화면 문구는 한국어 합쇼체/해요체의 정중한 표현으로, 간결하게 쓴다.",
    linted: false,
  },
];
