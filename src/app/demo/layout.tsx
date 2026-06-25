import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LocalMind Widget - Entegrasyon Demo",
  description: "AI chatbot widget entegrasyon demo sayfası",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
