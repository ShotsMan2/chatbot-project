"use client";

import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  value: string;
}

let highlighterPromise: Promise<Highlighter> | null = null;

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!highlighterPromise) {
      highlighterPromise = createHighlighter({
        themes: ["github-dark", "github-light"],
        langs: ["typescript", "javascript", "bash", "json", "html", "css", "python", "markdown"]
      });
    }

    highlighterPromise.then((highlighter) => {
      try {
        const langToUse = highlighter.getLoadedLanguages().includes(language as any) ? language : "javascript";
        const codeHtml = highlighter.codeToHtml(value, {
          lang: langToUse,
          theme: "github-dark", // You can switch based on active theme if you use next-themes
        });
        setHtml(codeHtml);
      } catch (e) {
        // Fallback if highlight fails
        setHtml(`<pre><code>${value}</code></pre>`);
      }
    });
  }, [language, value]);

  const onCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-md overflow-hidden my-4 border bg-zinc-950">
      <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 text-zinc-400 text-xs">
        <span>{language || "code"}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-400 hover:text-zinc-50"
          onClick={onCopy}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <div
        className="p-4 overflow-x-auto text-sm [&>pre]:!bg-transparent [&>pre]:!p-0 [&>pre]:!m-0"
        dangerouslySetInnerHTML={{ __html: html || `<pre><code>${value}</code></pre>` }}
      />
    </div>
  );
}
