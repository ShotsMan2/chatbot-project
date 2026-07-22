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
  //    But skip if it's already inside a markdown link (preceded by ])
  fixed = fixed.replace(/(?<!\()#product:([^\s\)\n]+)/g, (match, productData) => {
    return `[Ürün](#product:${productData})`;
  });

  return fixed;
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function parseProductFromHref(href: string): { id: string; name: string; price: string; oldPrice: string; rating: string; emoji: string } | null {
  if (!href.startsWith("#product:")) return null;
  const parts = href.substring(1).split(":");
  if (parts.length < 3) return null;

  const id = parts[1] || "0";
  const price = parts[2] || "0";
  const oldPrice = parts.length >= 4 ? parts[3] : String(Math.round((parseFloat(price) || 0) * 1.25));
  const rating = parts.length >= 5 ? safeDecode(parts[4]) : "4.8";
  const emoji = parts.length >= 6 ? safeDecode(parts[5]) : "📦";

  return { id, name: "", price, oldPrice, rating, emoji };
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

  const renderedContent = normalizeProductLinks(message.content);

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
          {renderedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
