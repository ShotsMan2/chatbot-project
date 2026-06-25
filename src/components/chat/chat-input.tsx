"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  isGenerating: boolean;
  onStop: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, isGenerating, onStop, disabled }: ChatInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (content.trim() && !isGenerating && !disabled) {
      onSend(content);
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  return (
    <div className="relative border rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-ring bg-background">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message LocalMind..."
        className="min-h-[56px] w-full resize-none border-0 p-4 pb-12 focus-visible:ring-0 shadow-none bg-transparent"
        rows={1}
        disabled={disabled}
      />
      <div className="absolute right-3 bottom-3">
        {isGenerating ? (
          <Button size="icon" variant="destructive" onClick={onStop} className="h-8 w-8 rounded-lg transition-all">
            <Square className="h-4 w-4 fill-current" />
          </Button>
        ) : (
          <Button 
            size="icon" 
            variant="default" 
            onClick={handleSend} 
            disabled={!content.trim() || disabled}
            className="h-8 w-8 rounded-lg transition-all"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
