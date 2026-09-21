import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";
import { zaiProvider } from "./zai-provider";

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment) {
    const { chatModel } = require("./models.mock");
    if (chatModel) {
      return chatModel;
    }
  }

  return zaiProvider.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment) {
    const { titleModel: mockTitleModel } = require("./models.mock");
    if (mockTitleModel) {
      return mockTitleModel;
    }
  }
  return zaiProvider.languageModel(titleModel.id);
}
