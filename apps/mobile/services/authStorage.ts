import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "cinewave_auth_token";

export const secureStorage = {
  async getToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEY);
      return token ?? null;
    } catch (error) {
      console.warn("Failed to read secure token:", error);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, token);
    } catch (error) {
      console.warn("Failed to write secure token:", error);
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to remove secure token:", error);
    }
  },
};