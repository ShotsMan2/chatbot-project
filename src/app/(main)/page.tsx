import { ChatContainer } from "@/components/chat/chat-container";
import { getSettings } from "@/lib/actions/chat";
import { ollamaClient } from "@/lib/ollama/ollama-client";
import { ModelInfo } from "@/lib/ollama/ollama-types";

export default async function Home() {
  const settings = await getSettings();
  let models: ModelInfo[] = [];
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
      initialMessages={[]}
      defaultModel={settings.defaultModel}
      models={models}
      ollamaStatus={ollamaStatus}
    />
  );
}
