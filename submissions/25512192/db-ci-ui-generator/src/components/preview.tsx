"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "@/lib/registry";
import { themeToCssVars, themes, type ThemeId } from "@/lib/ci/tokens";

/**
 * 생성된 스펙을 그리는 영역. 선택한 테마의 토큰을 이 영역의 CSS 변수로 주입하므로,
 * 같은 스펙이 "DB CI 적용 / 미적용"에 따라 다르게 보인다 (스펙에는 색 정보가 없다).
 */
export function Preview({
  spec,
  loading,
  resetKey,
  themeId,
}: {
  spec: Spec | null;
  loading: boolean;
  /** 바뀌면 폼 입력 등 런타임 상태를 초기화한다 (버전 전환 시). */
  resetKey: string;
  themeId: ThemeId;
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
    <div
      data-ci-theme={themeId}
      style={themeToCssVars(themes[themeId]) as CSSProperties}
      className="ci-surface relative mx-auto w-full max-w-5xl rounded-xl border p-6 shadow-sm"
    >
      {toast && (
        <div
          role="status"
          className="absolute right-4 top-4 z-20 max-w-sm rounded-md bg-foreground px-3 py-2 font-mono text-xs text-background shadow-lg"
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
