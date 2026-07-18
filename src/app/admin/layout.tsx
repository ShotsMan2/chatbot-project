import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LocalMind - Yönetim Paneli",
  description: "Kurumsal Yönetim Paneli",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
