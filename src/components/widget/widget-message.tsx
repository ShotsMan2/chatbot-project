"use client";

import ReactMarkdown from "react-markdown";

interface WidgetMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    status: "completed" | "streaming" | "failed";
  };
  color: string;
}

export function WidgetMessage({ message, color }: WidgetMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="widget-msg widget-msg-user" style={{ background: color }}>
        {message.content}
      </div>
    );
  }

  return (
    <div
      className={`widget-msg widget-msg-assistant${
        message.status === "failed" ? " widget-msg-error" : ""
      }`}
    >
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}
