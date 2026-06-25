import type { Metadata } from "next";
import "./widget.css";

export const metadata: Metadata = {
  title: "Chat Widget",
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="widget-body">{children}</body>
    </html>
  );
}
