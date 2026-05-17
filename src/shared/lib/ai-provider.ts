import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = "gemini" | "openai";

type GenerateAITextOptions = {
  provider?: AIProvider;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  apiKey?: string;
  responseMimeType?: string;
  temperature?: number;
};

export class AIProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderConfigurationError";
  }
}

export class AIProviderNotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderNotImplementedError";
  }
}

export function getConfiguredAIProvider(value = process.env.AI_PROVIDER): AIProvider {
  return value === "openai" ? "openai" : "gemini";
}

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY;
}

export function getGeminiModel(fallback = "gemini-2.5-flash") {
  return process.env.GEMINI_MODEL || fallback;
}

export function getQaGeniusGeminiApiKey() {
  return process.env.QAGENIUS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
}

export function getQaGeniusGeminiModel(fallback = "gemma-3-12b-it") {
  return process.env.QAGENIUS_GEMINI_MODEL || process.env.GEMINI_MODEL || fallback;
}

export function getOpenAIApiKey() {
  return process.env.OPENAI_API_KEY;
}

export function getOpenAIModel(fallback = "gpt-5.2") {
  return process.env.OPENAI_MODEL || fallback;
}

export async function generateAIText({
  provider = getConfiguredAIProvider(),
  systemPrompt,
  userPrompt,
  model,
  apiKey,
  responseMimeType,
  temperature,
}: GenerateAITextOptions) {
  if (provider === "openai") {
    throw new AIProviderNotImplementedError(
      "OpenAI provider is reserved for future Codex Enterprise migration and is not active yet.",
    );
  }

  if (!apiKey) {
    throw new AIProviderConfigurationError("Gemini API key is required for AI text generation.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model: model || getGeminiModel(),
    systemInstruction: systemPrompt,
    generationConfig: {
      ...(responseMimeType ? { responseMimeType } : {}),
      ...(temperature === undefined ? {} : { temperature }),
    },
  });

  const result = await generativeModel.generateContent(userPrompt);
  return result.response.text().trim();
}
