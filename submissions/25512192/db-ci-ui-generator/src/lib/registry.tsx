"use client";

import { defineRegistry } from "@json-render/react";
import { shadcnComponents as s } from "@json-render/shadcn";
import { catalog } from "./catalog";

/**
 * 카탈로그 → 실제 React 컴포넌트 매핑.
 * 표준 컴포넌트는 @json-render/shadcn 구현을 그대로 쓰고(색은 CSS 변수 = CI 토큰),
 * DB CI 전용 컴포넌트 4개만 직접 구현한다. 색은 전부 토큰 클래스(bg-primary 등)만 쓴다.
 */
export const { registry } = defineRegistry(catalog, {
  components: {
    Card: s.Card,
    Stack: s.Stack,
    Grid: s.Grid,
    Separator: s.Separator,
    Tabs: s.Tabs,
    Accordion: s.Accordion,
    Heading: s.Heading,
    Text: s.Text,
    Badge: s.Badge,
    Alert: s.Alert,
    Table: s.Table,
    Progress: s.Progress,
    Avatar: s.Avatar,
    Button: s.Button,
    Input: s.Input,
    Textarea: s.Textarea,
    Select: s.Select,
    Checkbox: s.Checkbox,
    Radio: s.Radio,
    Switch: s.Switch,

    BrandHeader: ({ props }) => (
      <header className="flex items-end justify-between gap-4 border-b-2 border-primary pb-4">
        <div className="min-w-0">
          {/* 공식 로고 파일을 확보하면 이 워드마크 자리에 <img>로 교체한다. */}
          <div className="text-sm font-bold tracking-wide text-primary">
            {props.affiliate}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {props.title}
          </h1>
          {props.subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{props.subtitle}</p>
          )}
        </div>
      </header>
    ),

    Metric: ({ props }) => {
      const arrow =
        props.trend === "up" ? "▲" : props.trend === "down" ? "▼" : "";
      const tone =
        props.trend === "up"
          ? "text-primary"
          : props.trend === "down"
            ? "text-destructive"
            : "text-muted-foreground";
      return (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">{props.label}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {props.value}
          </div>
          {props.delta && (
            <div className={`mt-1 text-xs font-medium tabular-nums ${tone}`}>
              {arrow} {props.delta}
            </div>
          )}
        </div>
      );
    },

    BarChart: ({ props }) => {
      const data = Array.isArray(props.data) ? props.data : [];
      const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
      return (
        <figure className="w-full">
          {props.title && (
            <figcaption className="mb-2 text-sm font-medium text-foreground">
              {props.title}
            </figcaption>
          )}
          <div className="flex h-40 items-end gap-2">
            {data.map((d, i) => (
              <div
                key={i}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="text-xs tabular-nums text-muted-foreground">
                  {d.value}
                  {props.unit ?? ""}
                </span>
                <div
                  className="w-full max-w-10 rounded-t-sm bg-primary"
                  style={{ height: `${((Number(d.value) || 0) / max) * 75}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2 border-t border-border pt-1">
            {data.map((d, i) => (
              <span
                key={i}
                className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground"
              >
                {d.label}
              </span>
            ))}
          </div>
        </figure>
      );
    },

    Steps: ({ props }) => {
      const steps = Array.isArray(props.steps) ? props.steps : [];
      const current = Number(props.current) || 0;
      return (
        <ol className="flex w-full items-start">
          {steps.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={i} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
                {i > 0 && (
                  <span
                    className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${done || active ? "bg-primary" : "bg-border"}`}
                  />
                )}
                <span
                  className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary bg-background text-primary"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`mt-2 px-1 text-sm ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="px-1 text-xs text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      );
    },
  },
  actions: {
    submit: async () => {},
    navigate: async () => {},
  },
});
