import { configRepository } from "../repositories/config.repository.js";

export const configService = {
  async getPublicConfig() {
    return configRepository.listPublicConfig();
  }
};
