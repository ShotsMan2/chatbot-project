"use client";

interface CemreParkChatWidgetMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
  };
}

export function CemreParkChatWidgetMessage({ message }: CemreParkChatWidgetMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`cemrepark-chat-widget-message ${isUser ? "user" : "assistant"}`}>
      <div className="cemrepark-chat-widget-message-text">{message.content}</div>
    </div>
  );
}
