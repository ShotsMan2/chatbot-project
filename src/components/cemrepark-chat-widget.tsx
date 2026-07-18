"use client";

import { useEffect, useRef, useState } from "react";
import { CemreParkChatWidgetMessage } from "./cemrepark-chat-widget-message";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function CemreParkChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const submitMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setErrorMessage("");
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Yazıyor...",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "API isteği başarısız oldu.");
      }

      const returnedSessionId = response.headers.get("X-Session-Id");
      if (returnedSessionId) {
        setSessionId(returnedSessionId);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Yanıt okunamadı.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

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
              assistantText += parsed.message.content;
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessage.id
                    ? { ...message, content: assistantText }
                    : message
                )
              );
            }
          } catch {
            // ignore partial JSON chunks
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (parsed.message?.content) {
            assistantText += parsed.message.content;
          }
        } catch {
          // ignore final parse failures
        }
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: assistantText }
            : message
        )
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: "Yanıt durduruldu." }
              : message
          )
        );
      } else {
        const messageText = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.";
        setErrorMessage(messageText);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: "Sistem yoğun. Lütfen daha sonra tekrar deneyin." }
              : message
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
    <div className="cemrepark-chat-widget-container">
      {isOpen ? (
        <div className="cemrepark-chat-widget-panel">
          <div className="cemrepark-chat-widget-header">
            <div>
              <h3>Alışveriş Asistanı</h3>
              <p>Size en hızlı şekilde yardımcı olabilirim.</p>
            </div>
            <button
              className="cemrepark-chat-widget-close"
              onClick={() => setIsOpen(false)}
              aria-label="Kapat"
            >
              ×
            </button>
          </div>

          <div className="cemrepark-chat-widget-body">
            {messages.length === 0 && (
              <div className="cemrepark-chat-widget-welcome">
                <strong>Merhaba!</strong>
                <p>Herhangi bir ürün, sipariş ya da teslimat sorusu sorabilirsiniz.</p>
              </div>
            )}

            {messages.map((message) => (
              <CemreParkChatWidgetMessage key={message.id} message={message} />
            ))}

            <div ref={bottomRef} />
          </div>

          <div className="cemrepark-chat-widget-footer">
            {errorMessage && <div className="cemrepark-chat-widget-error">{errorMessage}</div>}
            <textarea
              className="cemrepark-chat-widget-input"
              placeholder="Sorunuzu buraya yazın..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            {isLoading ? (
              <button className="cemrepark-chat-widget-send cemrepark-chat-widget-stop" onClick={() => abortControllerRef.current?.abort()}>
                Durdur
              </button>
            ) : (
              <button className="cemrepark-chat-widget-send" onClick={submitMessage} disabled={!input.trim()}>
                Gönder
              </button>
            )}
          </div>
        </div>
      ) : (
        <button className="cemrepark-chat-widget-launcher" onClick={() => setIsOpen(true)}>
          Sohbet Asistanı
        </button>
      )}
    </div>
  );
}
