"use client";

import ReactMarkdown from "react-markdown";

interface CemreParkChatWidgetMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
  };
}

const CATEGORY_EMOJI: Record<string, string> = {
  "Ayakkabı": "👟", "ayakkabi": "👟",
  "Çanta": "👜", "canta": "👜",
  "Elektronik": "📱", "elektronik": "📱",
  "Aksesuar": "🕶️", "aksesuar": "🕶️",
  "Giyim": "🧥", "giyim": "🧥",
};

function normalizeProductLinks(content: string): string {
  let fixed = content;

  // 1) Fix broken markdown links: "] (" or "]\n(" → "]("
  fixed = fixed.replace(/\]\s*\n\s*\(#product:/g, "](#product:");
  fixed = fixed.replace(/\]\s+\(#product:/g, "](#product:");

  // 2) If LLM wrote plain #product: without markdown link syntax, wrap it
  fixed = fixed.replace(/(?<!\()#product:([^\s\)\n]+)/g, (match, productData) => {
    return `[Ürün](#product:${productData})`;
  });

  return fixed;
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function parseProductFromHref(href: string) {
  if (!href.startsWith("#product:")) return null;
  const parts = href.substring(1).split(":");
  if (parts.length < 3) return null;

  return {
    id: parts[1] || "0",
    price: parts[2] || "0",
    oldPrice: parts.length >= 4 ? parts[3] : String(Math.round((parseFloat(parts[2]) || 0) * 1.25)),
    rating: parts.length >= 5 ? safeDecode(parts[4]) : "4.8",
    emoji: parts.length >= 6 ? safeDecode(parts[5]) : "📦",
  };
}

export function CemreParkChatWidgetMessage({ message }: CemreParkChatWidgetMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className={`cemrepark-chat-widget-message ${isUser ? "user" : "assistant"}`}>
        <div className="cemrepark-chat-widget-message-text">{message.content}</div>
      </div>
    );
  }

  const renderedContent = normalizeProductLinks(message.content);

  return (
    <div className="cemrepark-chat-widget-message assistant">
      <div className="cemrepark-chat-widget-message-text">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => {
              if (props.href?.startsWith("#product:")) {
                const product = parseProductFromHref(props.href);
                if (product) {
                  const name = props.children;
                  return (
                    <span className="widget-product-card">
                      <span className="widget-product-icon">{product.emoji}</span>
                      <span className="widget-product-details">
                        <span className="widget-product-name">{name}</span>
                        <span className="widget-product-rating">⭐ {product.rating}</span>
                        <span className="widget-product-prices">
                          <span className="widget-product-price">{product.price} TL</span>
                          {product.oldPrice !== product.price && (
                            <span className="widget-product-old-price">{product.oldPrice} TL</span>
                          )}
                        </span>
                      </span>
                      <button className="widget-product-btn" style={{ background: "#e91e8c" }}>
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
          {renderedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
