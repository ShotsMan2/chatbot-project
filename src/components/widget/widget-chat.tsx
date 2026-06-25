"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { WidgetMessage } from "./widget-message";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "completed" | "streaming" | "failed";
}

interface WidgetChatProps {
  color: string;
  title: string;
  welcomeMessage: string;
  model: string;
  context: string;
}

export function WidgetChat({ color, title, welcomeMessage, model, context }: WidgetChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "40px";
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      status: "completed",
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      status: "streaming",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    if (inputRef.current) {
      inputRef.current.style.height = "40px";
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          ...(model ? { model } : {}),
          ...(context ? { context } : {}),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("API error");
      }

      const returnedSessionId = response.headers.get("X-Session-Id");
      if (returnedSessionId) {
        setSessionId(returnedSessionId);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          try {
            const parsed = JSON.parse(trimmedLine);
            if (parsed.message?.content) {
              accumulated += parsed.message.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: accumulated }
                    : m
                )
              );
            }
          } catch {
            // ignore partial parse
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: accumulated, status: "completed" }
            : m
        )
      );

      // Notify parent window about new message
      window.parent.postMessage(
        { type: "localmind:message", content: accumulated },
        "*"
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, status: "completed" } : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.", status: "failed" }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="widget-header" style={{ background: color }}>
        <div className="widget-header-avatar">AI</div>
        <div className="widget-header-info">
          <div className="widget-header-title">{title}</div>
          <div className="widget-header-status">
            {isStreaming ? "Yazıyor..." : "Çevrimiçi"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="widget-messages">
        {messages.length === 0 && (
          <div className="widget-welcome">
            <div className="widget-welcome-icon" style={{ background: color }}>
              💬
            </div>
            <div className="widget-welcome-title">{title}</div>
            <div className="widget-welcome-text">{welcomeMessage}</div>
          </div>
        )}

        {messages.map((msg) => (
          <WidgetMessage key={msg.id} message={msg} color={color} />
        ))}

        {isStreaming &&
          messages[messages.length - 1]?.content === "" && (
            <div className="widget-msg widget-msg-thinking">
              <span className="widget-dot" />
              <span className="widget-dot" />
              <span className="widget-dot" />
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="widget-input-area">
        <div className="widget-input-form">
          <textarea
            ref={inputRef}
            className="widget-input"
            placeholder="Mesajınızı yazın..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              className="widget-send-btn"
              style={{ background: "#ef4444" }}
              onClick={handleStop}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              className="widget-send-btn"
              style={{ background: color }}
              onClick={handleSend}
              disabled={!input.trim()}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="widget-footer">
        Powered by <a href="/" target="_blank" rel="noopener">LocalMind</a>
      </div>
    </>
  );
}
