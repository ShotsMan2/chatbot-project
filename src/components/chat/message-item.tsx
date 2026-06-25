"use client";

import { Message } from "./chat-container";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "./code-block";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, RefreshCw, AlertCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="h-8 w-8 shrink-0 mt-1 border bg-background">
        {isUser ? (
          <AvatarFallback>U</AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">LM</AvatarFallback>
        )}
      </Avatar>

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm font-semibold">
            {isUser ? "You" : "LocalMind"}
          </span>
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy message">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        <div className={`group relative flex flex-col p-4 rounded-2xl ${
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted/50 rounded-tl-sm border"
        }`}>
          {message.status === "failed" && (
            <div className="flex items-center gap-2 text-destructive mb-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              Failed to generate response
            </div>
          )}
          {message.status === "cancelled" && (
            <div className="flex items-center gap-2 text-muted-foreground mb-2 text-sm font-medium">
              <StopCircle className="h-4 w-4" />
              Generation stopped
            </div>
          )}
          
          <div className="prose dark:prose-invert max-w-none break-words text-sm prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
            {message.content ? (
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isInline = inline || !match;
                    if (!isInline && match) {
                      return (
                        <CodeBlock
                          language={match[1]}
                          value={String(children).replace(/\n$/, "")}
                        />
                      );
                    }
                    return (
                      <code className={`${className} bg-muted px-1.5 py-0.5 rounded-md`} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              message.status === "streaming" && (
                <span className="text-muted-foreground animate-pulse">Thinking...</span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
