"use client";

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

  // Simple markdown-like rendering for assistant messages
  const renderContent = (text: string) => {
    if (!text) return null;

    // Split by code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeContent = part.slice(3, -3);
        const firstNewline = codeContent.indexOf("\n");
        const code = firstNewline > -1 ? codeContent.slice(firstNewline + 1) : codeContent;
        return (
          <pre key={i}>
            <code>{code}</code>
          </pre>
        );
      }

      // Handle inline formatting
      const lines = part.split("\n");
      return lines.map((line, j) => {
        if (!line.trim()) return j > 0 ? <br key={`${i}-${j}`} /> : null;

        // Bold
        let formatted: React.ReactNode = line;
        const boldParts = line.split(/(\*\*.*?\*\*)/g);
        if (boldParts.length > 1) {
          formatted = boldParts.map((bp, k) => {
            if (bp.startsWith("**") && bp.endsWith("**")) {
              return <strong key={k}>{bp.slice(2, -2)}</strong>;
            }
            return bp;
          });
        }

        // Inline code
        if (typeof formatted === "string") {
          const codeParts = formatted.split(/(`[^`]+`)/g);
          if (codeParts.length > 1) {
            formatted = codeParts.map((cp, k) => {
              if (cp.startsWith("`") && cp.endsWith("`")) {
                return <code key={k}>{cp.slice(1, -1)}</code>;
              }
              return cp;
            });
          }
        }

        return (
          <p key={`${i}-${j}`} style={{ margin: 0 }}>
            {formatted}
          </p>
        );
      });
    });
  };

  return (
    <div
      className={`widget-msg widget-msg-assistant${
        message.status === "failed" ? " widget-msg-error" : ""
      }`}
    >
      {renderContent(message.content)}
    </div>
  );
}
