export class OllamaConnectionError extends Error {
  constructor(message: string = "Failed to connect to Ollama") {
    super(message);
    this.name = "OllamaConnectionError";
  }
}

export class ModelNotFoundError extends Error {
  constructor(public modelName: string) {
    super(`Model '${modelName}' not found.`);
    this.name = "ModelNotFoundError";
  }
}

export class InvalidChatRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidChatRequestError";
  }
}

export class GenerationCancelledError extends Error {
  constructor() {
    super("Generation cancelled by user");
    this.name = "GenerationCancelledError";
  }
}

export class OllamaResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaResponseError";
  }
}
