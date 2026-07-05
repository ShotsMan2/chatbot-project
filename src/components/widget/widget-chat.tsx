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
  const [localContext, setLocalContext] = useState(context);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "localmind:init_context" && event.data.context) {
        setLocalContext(event.data.context);
      }
    };
    window.addEventListener("message", handleMessage);

    // Notify parent that we are ready to receive the context
    window.parent.postMessage({ type: "localmind:ready" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

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

  const handleSend = async (textOverride?: string | React.MouseEvent | React.FormEvent) => {
    const override = typeof textOverride === "string" ? textOverride : undefined;
    const trimmed = (override || input).trim();
    if (!trimmed || isStreaming) return;

    if (!override) {
      setInput("");
      if (inputRef.current) {
        inputRef.current.style.height = "40px";
      }
    }

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
    setIsStreaming(true);

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
          ...(localContext ? { context: localContext } : {}),
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
              ? { ...m, content: "Sistemimizde anlık bir yoğunluk yaşıyoruz. Lütfen kısa bir süre sonra tekrar deneyebilir misiniz?", status: "failed" }
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
        <div className="widget-header-avatar">
          <svg viewBox="0 0 24 24">
            <path d="M12 1c-5 0-9 4-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h4v1h-7v2h6c1.66 0 3-1.34 3-3V10c0-5-4-9-9-9z"/>
          </svg>
        </div>
        <div className="widget-header-info">
          <div className="widget-header-title">{title}</div>
          <div className="widget-header-status">
            {isStreaming ? "Yanıtlanıyor..." : "Çevrimiçi"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="widget-messages">
        {messages.length === 0 && (
          <div className="widget-welcome">
            <div className="widget-welcome-icon" style={{ background: color }}>
              <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: "currentColor" }}>
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
              </svg>
            </div>
            <div className="widget-welcome-title">{title}</div>
            <div className="widget-welcome-text">{welcomeMessage}</div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px", justifyContent: "center" }}>
              {["📦 Sipariş Durumu", "📞 İletişim Bilgileriniz", "🔄 İade ve Değişim"].map((quickReply) => (
                <button
                  key={quickReply}
                  onClick={() => handleSend(quickReply)}
                  style={{
                    background: "#f3f4f6",
                    border: `1px solid ${color}40`,
                    color: "#374151",
                    padding: "6px 12px",
                    borderRadius: "16px",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                >
                  {quickReply}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => {
          if (isStreaming && index === messages.length - 1 && msg.content === "") {
            return null;
          }
          return <WidgetMessage key={msg.id} message={msg} color={color} />;
        })}

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
            placeholder="Size nasıl yardımcı olabilirim?..."
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
        Powered by <a href="/" target="_blank" rel="noopener">Sitemizin Efesi</a>
      </div>
    </>
  );
}
