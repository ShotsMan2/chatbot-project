export interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
}

export interface ChatInput {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_ctx?: number;
    top_p?: number;
    top_k?: number;
  };
  tools?: any[];
  signal?: AbortSignal;
}

export interface LlmProvider {
  healthCheck(): Promise<boolean>;
  listModels(): Promise<ModelInfo[]>;
  chat(input: ChatInput): Promise<ReadableStream<Uint8Array>>;
}

export interface OllamaChatResponseChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
    tool_calls?: any[];
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}
