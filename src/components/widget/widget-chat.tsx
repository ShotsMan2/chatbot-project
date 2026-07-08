"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { WidgetMessage, Message } from "./widget-message";

interface WidgetChatProps {
  color: string;
  title: string;
  welcomeMessage: string;
  model: string;
  context: string;
}

export function WidgetChat({ color, title, welcomeMessage, model, context }: WidgetChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [localContext, setLocalContext] = useState(context);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/widget/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          sessionId,
          model,
          context: localContext,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const returnedSessionId = response.headers.get("X-Session-Id");
      if (returnedSessionId && returnedSessionId !== sessionId) {
        setSessionId(returnedSessionId);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        toolInvocations: [],
      };

      setMessages(prev => [...prev, assistantMessage]);

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
            const data = JSON.parse(trimmed);
            
            // Handle both Ollama chat API (/api/chat) and generate API (/api/generate) formats
            const contentChunk = data.message?.content || data.response || "";

            if (contentChunk) {
              setMessages(prev => prev.map(msg => {
                if (msg.id === assistantMessageId) {
                  return { ...msg, content: msg.content + contentChunk };
                }
                return msg;
              }));
            }
          } catch (e) {
            // Buffer structure is preserved for incomplete JSONs
          }
        }
      }

      setMessages(prev => {
        const lastMsg = prev.find(msg => msg.id === assistantMessageId);
        if (lastMsg) {
          window.parent.postMessage({ type: "localmind:message", content: lastMsg.content }, "*");
        }
        return prev;
      });

    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
            updated[updated.length - 1].status = "cancelled";
          }
          return updated;
        });
      } else {
        console.error("Chat error:", err);
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
            updated[updated.length - 1].status = "failed";
          }
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
  };

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data?.type === "localmind:init_context" && event.data.context) {
        setLocalContext(event.data.context);
      }
    };
    window.addEventListener("message", handleIframeMessage);
    window.parent.postMessage({ type: "localmind:ready" }, "*");

    return () => window.removeEventListener("message", handleIframeMessage);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom, isLoading]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      sendMessage(input);
    }
  };

  const handleQuickReply = (reply: string) => {
    if (isLoading) return;
    sendMessage(reply);
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
            {isLoading ? "Yanıtlanıyor..." : "Çevrimiçi"}
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
                  onClick={() => handleQuickReply(quickReply)}
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
          // ai/react returns id, role, content
          return <WidgetMessage key={msg.id} message={{ ...msg, status: index === messages.length - 1 && isLoading ? "streaming" : "completed" }} color={color} />;
        })}

        {isLoading &&
          messages[messages.length - 1]?.role === "user" && (
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
        <form className="widget-input-form" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="widget-input"
            placeholder="Size nasıl yardımcı olabilirim?..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={isLoading}
            style={{ minHeight: "40px", maxHeight: "100px", resize: "none" }}
          />
          {isLoading ? (
            <button
              className="widget-send-btn"
              style={{ background: "#ef4444" }}
              onClick={() => stop()}
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
              type="submit"
              disabled={!input.trim()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="widget-footer">
        Powered by <a href="/" target="_blank" rel="noopener">Sitemizin Efesi</a>
      </div>
    </>
  );
}
