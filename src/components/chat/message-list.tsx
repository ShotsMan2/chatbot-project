"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "./chat-container";
import { MessageItem } from "./message-item";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
}

export function MessageList({ messages, isGenerating }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <ScrollArea ref={scrollRef} className="h-full w-full" onScrollCapture={handleScroll}>
      <div className="flex flex-col gap-6 p-4 max-w-3xl mx-auto pb-8">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground mt-32">
            <h3 className="text-2xl font-semibold mb-2">Welcome to LocalMind</h3>
            <p>Start a conversation to see it here.</p>
          </div>
        )}
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {isGenerating && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center space-x-2 p-4 text-muted-foreground">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
