"use client";

import { useState, useRef, useEffect } from "react";
import { ChatInput } from "./chat-input";
import { MessageList } from "./message-list";
import { useRouter } from "next/navigation";

export interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  status?: "pending" | "streaming" | "completed" | "cancelled" | "failed";
}

interface ChatContainerProps {
  initialMessages: Message[];
  conversationId?: string;
  defaultModel: string;
  models: { name: string }[];
  ollamaStatus: "ok" | "error" | "loading";
}

export function ChatContainer({
  initialMessages,
  conversationId,
  defaultModel,
  models,
  ollamaStatus
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState(defaultModel);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleSend = async (content: string) => {
    if (!content.trim()) return;

    const newUserMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      status: "completed"
    };
    
    const newAssistantMsg: Message = {
      id: crypto.randomUUID(), // will be overridden by server
      role: "assistant",
      content: "",
      status: "streaming"
    };

    const newMessages = [...messages, newUserMsg];
    setMessages([...newMessages, newAssistantMsg]);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId,
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const returnedConvId = response.headers.get("X-Conversation-Id");
      const returnedMsgId = response.headers.get("X-Message-Id") || newAssistantMsg.id;
      
      // Update the assistant message ID based on what the server created
      setMessages(prev => 
        prev.map(msg => msg.id === newAssistantMsg.id ? { ...msg, id: returnedMsgId } : msg)
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No response stream");

      let accumulatedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message?.content) {
              accumulatedContent += parsed.message.content;
              setMessages(prev => prev.map(msg => 
                msg.id === returnedMsgId 
                  ? { ...msg, content: accumulatedContent } 
                  : msg
              ));
            }
          } catch (e) {
            // parsing error on partial NDJSON chunk
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (parsed.message?.content) {
            accumulatedContent += parsed.message.content;
          }
        } catch (e) {}
      }

      setMessages(prev => prev.map(msg => 
        msg.id === returnedMsgId 
          ? { ...msg, content: accumulatedContent, status: "completed" } 
          : msg
      ));

      if (!conversationId && returnedConvId) {
        router.push(`/chat/${returnedConvId}`);
      }

    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages(prev => {
          const arr = [...prev];
          arr[arr.length - 1].status = "cancelled";
          return arr;
        });
      } else {
        setMessages(prev => {
          const arr = [...prev];
          arr[arr.length - 1].status = "failed";
          return arr;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col h-full relative w-full">
      <div className="h-14 border-b flex flex-row items-center justify-between px-4 sticky top-0 bg-background/95 backdrop-blur z-10 shrink-0">
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          Model:
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            className="bg-transparent border-none text-foreground text-sm focus:ring-0 outline-none cursor-pointer"
            disabled={isGenerating}
          >
            {models.length > 0 ? models.map(m => (
              <option key={m.name} value={m.name}>{m.name}</option>
            )) : <option value={defaultModel}>{defaultModel}</option>}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${ollamaStatus === 'ok' ? 'bg-green-500' : ollamaStatus === 'loading' ? 'bg-yellow-500' : 'bg-red-500'}`} />
          <span className="text-muted-foreground hidden sm:inline-block">
            {ollamaStatus === 'ok' ? 'Connected' : ollamaStatus === 'loading' ? 'Connecting...' : 'Ollama disconnected'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <MessageList messages={messages} isGenerating={isGenerating} />
      </div>

      <div className="p-4 bg-background shrink-0">
        <div className="max-w-3xl mx-auto">
          {ollamaStatus === 'error' && (
            <div className="mb-4 p-4 border rounded-lg bg-red-500/10 text-red-500 text-sm">
              <p className="font-semibold mb-1">Cannot connect to Ollama</p>
              <p>Please make sure Ollama is running on your machine.</p>
              <code className="block mt-2 bg-red-500/20 p-2 rounded">ollama serve</code>
            </div>
          )}
          <ChatInput onSend={handleSend} isGenerating={isGenerating} onStop={handleStop} disabled={ollamaStatus === 'error'} />
        </div>
      </div>
    </div>
  );
}
