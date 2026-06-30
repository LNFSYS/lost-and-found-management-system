import { configRepository } from "../repositories/config.repository.js";

export const configService = {
  async getPublicConfig() {
    return configRepository.listPublicConfig();
  },

  async getAllConfig() {
    return configRepository.listAllConfig();
  },

  async updateConfig(key: string, value: unknown, actorId: string) {
    return configRepository.updateConfig(key, value, actorId);
  },

  async history(limit?: number) {
    return configRepository.history(limit);
  }
};
