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

  // 3) Handle Turkish characters in emoji field (e.g., %F0%9F%91%96 instead of 🕶️)
  fixed = fixed.replace(/#product:([^)]+)/g, (match, productData) => {
    // Decode URI components in product data
    const decoded = productData.split(':').map((part: string) => {
      try { return decodeURIComponent(part); } catch { return part; }
    }).join(':');
    return `#product:${decoded}`;
  });

  // 4) Handle cases where LLM puts product info in parentheses without markdown link
  //    e.g., (Güneş Gözlüğü - UV400, Fiyat: 449 TL, Kategori: Aksesuar, Stok: 60)
  fixed = fixed.replace(/\(([^)]*(?:TL|₺|Fiyat)[^)]*)\)/g, (match, content) => {
    // Check if this looks like product info with price
    if (content.includes('TL') || content.includes('₺') || content.includes('Fiyat')) {
      // Extract product name and price
      const nameMatch = content.match(/^([^,]+)/);
      const priceMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:TL|₺)/);
      if (nameMatch && priceMatch) {
        return `[${nameMatch[1].trim()}](#product:0:${priceMatch[1]}:${Math.round(parseFloat(priceMatch[1]) * 1.25)}:4.8:${encodeURIComponent('📦')})`;
      }
    }
    return match;
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
  
  // Handle emoji - it might be URI encoded or a Unicode character
  let emoji = "📦";
  if (parts.length >= 6) {
    const emojiRaw = parts.slice(5).join(':'); // Rejoin in case emoji contains colons
    emoji = safeDecode(emojiRaw);
    // If still encoded, try to decode again
    if (emoji.includes('%')) {
      emoji = safeDecode(emoji);
    }
  }

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

  // First, try to detect product info in parentheses and convert to proper links
  let content = message.content;
  
  // Pattern: (Ürün Adı - ..., Fiyat: XXX TL, Kategori: ..., Stok: ...)
  const productInfoRegex = /\(([^)]*(?:Fiyat|TL|₺)[^)]*)\)/g;
  content = content.replace(productInfoRegex, (match, innerContent) => {
    // Extract product details
    const nameMatch = innerContent.match(/^([^-]+)/);
    const priceMatch = innerContent.match(/(\d+(?:\.\d+)?)\s*(?:TL|₺)/);
    const categoryMatch = innerContent.match(/Kategori:\s*([^,]+)/i);
    const stockMatch = innerContent.match(/Stok:\s*(\d+)/i);
    
    if (nameMatch && priceMatch) {
      const name = nameMatch[1].trim();
      const price = priceMatch[1];
      const oldPrice = String(Math.round(parseFloat(price) * 1.25));
      const category = categoryMatch ? categoryMatch[1].trim() : "Genel";
      
      // Map category to emoji
      const categoryEmoji: Record<string, string> = {
        "Ayakkabı": "👟", "ayakkabi": "👟",
        "Çanta": "👜", "canta": "👜",
        "Elektronik": "📱", "elektronik": "📱",
        "Aksesuar": "🕶️", "aksesuar": "🕶️",
        "Giyim": "🧥", "giyim": "🧥",
      };
      const emoji = categoryEmoji[category] || "📦";
      
      return `[${name}](#product:0:${price}:${oldPrice}:4.8:${encodeURIComponent(emoji)})`;
    }
    return match;
  });

  const renderedContent = normalizeProductLinks(content);

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
                  // Get name from children - might be string or array
                  let name = "";
                  if (typeof props.children === 'string') {
                    name = props.children;
                  } else if (Array.isArray(props.children)) {
                    name = props.children.join('');
                  } else if (props.children && typeof props.children === 'object') {
                    name = String(props.children);
                  }
                  
                  // If name is empty or just "Ürün", try to extract from href
                  if (!name || name === "Ürün") {
                    // Try to get name from the text before the link
                    name = "Ürün";
                  }

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
