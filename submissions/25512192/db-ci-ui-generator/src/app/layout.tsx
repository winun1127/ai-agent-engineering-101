import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DB CI UI Studio",
  description:
    "json-render 기반 AI 에이전트가 DB그룹 CI를 자동 반영한 UI를 생성합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
