import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { dbTheme, themeToCssVars } from "@/lib/ci/tokens";

export const metadata: Metadata = {
  title: "DB CI UI Studio",
  description:
    "json-render 기반 AI 에이전트가 DB그룹 CI를 자동 반영한 UI를 생성합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // 서비스 화면(shadcn/ui) 자체도 DB CI 토큰으로 칠한다. 값의 출처는 tokens.ts 하나.
    <html
      lang="ko"
      className="h-full font-sans"
      style={themeToCssVars(dbTheme) as CSSProperties}
    >
      <body className="h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
