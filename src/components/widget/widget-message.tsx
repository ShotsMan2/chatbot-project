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
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => {
              if (props.href?.startsWith("#product:")) {
                const parts = props.href.substring(1).split(":");
                // product:ID:Price:OldPrice:Rating:Emoji
                if (parts.length >= 6) {
                  const id = parts[1];
                  const price = parts[2];
                  const oldPrice = parts[3];
                  const rating = decodeURIComponent(parts[4]);
                  const emoji = decodeURIComponent(parts[5]);
                  const name = props.children;

                  return (
                    <span className="widget-product-card">
                      <span className="widget-product-icon">{emoji}</span>
                      <span className="widget-product-details">
                        <span className="widget-product-name">{name}</span>
                        <span className="widget-product-rating">⭐ {rating}</span>
                        <span className="widget-product-prices">
                          <span className="widget-product-price">{price} TL</span>
                          <span className="widget-product-old-price">{oldPrice} TL</span>
                        </span>
                      </span>
                      <button 
                        className="widget-product-btn" 
                        style={{ background: color }}
                        onClick={() => alert(`${name} sepete eklendi!`)}
                      >
                        Sepete Ekle
                      </button>
                    </span>
                  );
                }
              }
              return <a {...props} />;
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
