"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, MessageSquare, Trash2, Settings } from "lucide-react";
import { deleteConversation } from "@/lib/actions/chat";

interface SidebarProps {
  conversations: any[];
}

export function Sidebar({ conversations }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation(id);
    if (pathname.includes(id)) {
      router.push("/");
    }
  };

  return (
    <div className="w-64 border-r bg-zinc-50/50 dark:bg-zinc-900/50 h-screen flex flex-col hidden md:flex">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-lg tracking-tight">LocalMind</h2>
      </div>
      <div className="p-4">
        <Button render={<Link href="/" />} nativeButton={false} className="w-full justify-start gap-2" variant="default">
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 flex flex-col">
          {conversations.map((conv) => {
            const isActive = pathname === `/chat/${conv.id}`;
            return (
              <div key={conv.id} className="relative group">
                <Button
                  render={<Link href={`/chat/${conv.id}`} />}
                  nativeButton={false}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start pr-10 text-left font-normal truncate h-10"
                >
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">{conv.title || "New Chat"}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(conv.id, e)}
                  title="Delete chat"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <Button render={<Link href="/settings" />} nativeButton={false} variant="ghost" className="w-full justify-start gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
