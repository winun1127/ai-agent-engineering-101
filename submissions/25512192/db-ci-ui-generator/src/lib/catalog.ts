import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions as s } from "@json-render/shadcn/catalog";
import { z } from "zod";

/**
 * 에이전트가 쓸 수 있는 컴포넌트의 전체 목록(가드레일).
 * 모델은 여기 없는 컴포넌트·props를 만들 수 없고, 색상 props가 아예 없으므로
 * 색은 전적으로 CI 테마 토큰이 결정한다.
 * 이 파일은 React에 의존하지 않아 서버(프롬프트 생성·검증)에서도 import 된다.
 */
export const catalog = defineCatalog(schema, {
  components: {
    // 레이아웃
    Card: s.Card,
    Stack: s.Stack,
    Grid: s.Grid,
    Separator: s.Separator,
    Tabs: s.Tabs,
    Accordion: s.Accordion,
    // 콘텐츠
    Heading: s.Heading,
    Text: s.Text,
    Badge: s.Badge,
    Alert: s.Alert,
    Table: s.Table,
    Progress: s.Progress,
    Avatar: s.Avatar,
    // 입력
    Button: s.Button,
    Input: s.Input,
    Textarea: s.Textarea,
    Select: s.Select,
    Checkbox: s.Checkbox,
    Radio: s.Radio,
    Switch: s.Switch,

    // DB CI 전용 컴포넌트
    BrandHeader: {
      props: z.object({
        affiliate: z.string(),
        title: z.string(),
        subtitle: z.string().nullable(),
      }),
      description:
        "DB CI 브랜드 헤더. affiliate에는 계열사명(예: 'DB Inc.'), title에는 화면 제목. 모든 화면의 최상단에 정확히 1개 배치한다.",
    },
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        delta: z.string().nullable(),
        trend: z.enum(["up", "down", "neutral"]).nullable(),
      }),
      description:
        "KPI 지표 카드. value는 단위를 포함한 문자열(예: '99.95%'), delta는 전기 대비 변화(예: '+0.3%p'). 여러 개를 Grid 안에 나란히 배치한다.",
    },
    BarChart: {
      props: z.object({
        title: z.string().nullable(),
        unit: z.string().nullable(),
        data: z.array(z.object({ label: z.string(), value: z.number() })),
      }),
      description:
        "CI 색상의 막대 차트. 추이·비교 데이터 표시용. data는 3~12개 항목.",
    },
    Steps: {
      props: z.object({
        steps: z.array(
          z.object({ title: z.string(), description: z.string().nullable() }),
        ),
        current: z.number(),
      }),
      description:
        "단계 진행 표시(접수 → 심사 → 완료 등). current는 0부터 시작하는 현재 단계 인덱스.",
    },
  },
  actions: {
    submit: { description: "폼 제출. 데모에서는 화면 상단에 알림만 표시된다." },
    navigate: {
      description: "다른 화면으로 이동. 데모에서는 화면 상단에 알림만 표시된다.",
    },
  },
});

export type AppCatalog = typeof catalog;
