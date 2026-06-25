import { ChatContainer, Message } from "@/components/chat/chat-container";
import { getConversation, getMessages, getSettings } from "@/lib/actions/chat";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { notFound } from "next/navigation";

export default async function ChatPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    notFound();
  }

  const rawMessages = await getMessages(conversationId);
  const initialMessages: Message[] = rawMessages.map(m => ({
    id: m.id,
    role: m.role as "system" | "user" | "assistant",
    content: m.content,
    status: m.status as any,
  }));

  const settings = await getSettings();
  let models = [];
  let ollamaStatus: "ok" | "error" | "loading" = "ok";
  
  try {
    const isHealthy = await ollamaClient.healthCheck();
    if (isHealthy) {
      models = await ollamaClient.listModels();
    } else {
      ollamaStatus = "error";
    }
  } catch (e) {
    ollamaStatus = "error";
  }

  return (
    <ChatContainer
      initialMessages={initialMessages}
      conversationId={conversationId}
      defaultModel={conversation.model || settings.defaultModel}
      models={models}
      ollamaStatus={ollamaStatus}
    />
  );
}
