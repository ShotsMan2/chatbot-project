"use client";

import ReactMarkdown from "react-markdown";

export interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  status?: string;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    state: "result" | "call";
    result?: any;
  }>;
}

interface WidgetMessageProps {
  message: Message;
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
        {message.content && (
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
        )}
      </div>

      {/* GENERATIVE UI TOOL INVOCATIONS */}
      {message.toolInvocations && message.toolInvocations.map((tool) => {
        if (tool.toolName === "checkOrderStatus" && tool.state === "result") {
          const { status, expectedDelivery, courier, trackingUrl } = tool.result;
          return (
            <div key={tool.toolCallId} style={{ marginTop: "12px", padding: "12px", borderRadius: "8px", border: `1px solid ${color}40`, background: "#f9fafb" }}>
              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "8px" }}>📦 Sipariş Durumu: {status}</div>
              {expectedDelivery && <div style={{ fontSize: "13px", color: "#4b5563" }}>Teslimat: {expectedDelivery}</div>}
              {courier && <div style={{ fontSize: "13px", color: "#4b5563" }}>Kargo: {courier}</div>}
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "8px", color, fontWeight: 500, fontSize: "13px", textDecoration: "none" }}>
                  Kargo Takip ↗
                </a>
              )}
            </div>
          );
        }

        if (tool.toolName === "showProductCards" && tool.state === "result") {
          const products = tool.result.products || [];
          if (products.length === 0) return null;

          return (
            <div key={tool.toolCallId} style={{ display: "flex", overflowX: "auto", gap: "12px", marginTop: "12px", padding: "4px 0", scrollbarWidth: "none" }}>
              {products.map((p: any) => (
                <div key={p.id} style={{ minWidth: "160px", maxWidth: "200px", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", flexShrink: 0 }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "4px", marginBottom: "8px" }} />
                  ) : (
                    <div style={{ width: "100%", height: "120px", background: "#f3f4f6", borderRadius: "4px", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>📦</div>
                  )}
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "#111827", marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color }}>{p.price} TL</div>
                  <button style={{ width: "100%", padding: "6px", marginTop: "8px", background: color, color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }} onClick={() => alert(`${p.name} sepete eklendi`)}>İncele / Al</button>
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

