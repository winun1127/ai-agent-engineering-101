"use client";

import { useEffect, useMemo, useState } from "react";
import type { Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/registry";
import { themeToCssVars, themes, type ThemeId } from "@/lib/ci/tokens";

/**
 * 선택된 테마의 토큰을 :root CSS 변수로 주입한다.
 * (Select 드롭다운처럼 body에 포털로 그려지는 요소에도 CI가 적용되도록 :root에 건다.)
 */
export function ThemeVars({ themeId }: { themeId: ThemeId }) {
  useEffect(() => {
    const vars = themeToCssVars(themes[themeId]);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.dataset.ciTheme = themeId;
  }, [themeId]);
  return null;
}

export function Preview({
  spec,
  loading,
  resetKey,
}: {
  spec: Spec | null;
  loading: boolean;
  /** 바뀌면 폼 입력 등 런타임 상태를 초기화한다 (버전 전환 시). */
  resetKey: string;
}) {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const handlers = useMemo(
    () => ({
      submit: (params: Record<string, unknown>) =>
        setToast(`submit 액션 실행 ${JSON.stringify(params ?? {})}`),
      navigate: (params: Record<string, unknown>) =>
        setToast(`navigate 액션 실행 ${JSON.stringify(params ?? {})}`),
    }),
    [],
  );

  if (!spec?.root || !spec.elements[spec.root]) return null;

  return (
    <div className="ci-surface relative mx-auto w-full max-w-5xl rounded-lg border border-zinc-200 p-6 shadow-sm">
      {toast && (
        <div
          role="status"
          className="absolute right-4 top-4 z-20 max-w-sm rounded-md bg-zinc-900 px-3 py-2 font-mono text-xs text-white shadow-lg"
        >
          {toast}
        </div>
      )}
      <JSONUIProvider
        key={`${resetKey}:${JSON.stringify(spec.state ?? {})}`}
        registry={registry}
        initialState={(spec.state as Record<string, unknown>) ?? {}}
        handlers={handlers}
      >
        <Renderer spec={spec} registry={registry} loading={loading} />
      </JSONUIProvider>
    </div>
  );
}
