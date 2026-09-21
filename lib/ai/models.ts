export const DEFAULT_CHAT_MODEL = "glm-4.6";

export const titleModel = {
  description: "Fast model for title generation",
  id: "glm-4-flash",
  name: "GLM-4 Flash",
  provider: "zai",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export const chatModels: ChatModel[] = [
  {
    description: "Z.AI flagship model with tool use and vision",
    id: "glm-4.6",
    name: "GLM-4.6",
    provider: "zai",
  },
  {
    description: "Capable general purpose model with tool use",
    id: "glm-4.5",
    name: "GLM-4.5",
    provider: "zai",
  },
  {
    description: "Lightweight fast model with tool use",
    id: "glm-4.5-air",
    name: "GLM-4.5 Air",
    provider: "zai",
  },
  {
    description: "Ultra fast model for quick answers",
    id: "glm-4-flash",
    name: "GLM-4 Flash",
    provider: "zai",
  },
];

// Static capability map resolved locally — no external gateway calls needed.
export const modelCapabilities: Record<string, ModelCapabilities> = {
  "glm-4-flash": { reasoning: false, tools: true, vision: false },
  "glm-4.5": { reasoning: false, tools: true, vision: true },
  "glm-4.5-air": { reasoning: false, tools: true, vision: false },
  "glm-4.6": { reasoning: true, tools: true, vision: true },
};

export function getCapabilities(): Promise<Record<string, ModelCapabilities>> {
  return Promise.resolve(modelCapabilities);
}

export const isDemo = process.env.IS_DEMO === "1";

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export function getAllGatewayModels(): Promise<GatewayModelWithCapabilities[]> {
  return Promise.resolve(
    chatModels.map((model) => ({
      ...model,
      capabilities: modelCapabilities[model.id] ?? {
        reasoning: false,
        tools: false,
        vision: false,
      },
    }))
  );
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

export type ModelAvailability = "healthy" | "impacted" | "unknown";

export function getModelAvailability(
  modelId: string
): Promise<ModelAvailability> {
  return Promise.resolve(allowedModelIds.has(modelId) ? "healthy" : "unknown");
}
