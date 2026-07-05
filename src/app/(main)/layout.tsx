import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { CleanupToast } from "@/components/cleanup-toast";
import { getConversations, getSettings } from "@/lib/actions/chat";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LocalMind",
  description: "Your local AI assistant powered by Ollama",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let conversations: Awaited<ReturnType<typeof getConversations>> = [];
  let cleanupInfo: { lastCleanupAt: Date | null; lastCleanupCount: number | null } | null = null;
  try {
    conversations = await getConversations();
    cleanupInfo = await getSettings().then((s) => ({
      lastCleanupAt: s.lastCleanupAt ?? null,
      lastCleanupCount: s.lastCleanupCount ?? null,
    }));
  } catch (e) {
    console.error("Failed to load conversations:", e);
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} flex h-screen w-full bg-background overflow-hidden text-foreground`}>
        <TooltipProvider>
          <Sidebar conversations={conversations} />
          <main className="flex-1 flex flex-col min-w-0">
            {children}
          </main>
        </TooltipProvider>
        <Toaster />
        <CleanupToast
          lastCleanupAt={cleanupInfo?.lastCleanupAt?.toISOString() ?? null}
          lastCleanupCount={cleanupInfo?.lastCleanupCount ?? null}
        />
      </body>
    </html>
  );
}
