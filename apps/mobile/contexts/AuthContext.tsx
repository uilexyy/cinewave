import React, { createContext, useContext, useState, useEffect } from "react";
import { secureStorage } from "../services/authStorage";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStoredToken() {
      try {
        const storedToken = await secureStorage.getToken();
        if (storedToken) {
          setToken(storedToken);
          // Verify token with backend /api/v1/auth/me
          const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
          const res = await fetch(`${apiUrl}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          const json = await res.json();
          if (json.success && json.data?.user) {
            setUser(json.data.user);
          } else {
            await secureStorage.removeToken();
            setToken(null);
          }
        }
      } catch (error) {
        console.warn("Failed to load auth state:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredToken();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await secureStorage.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      if (token) {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
        await fetch(`${apiUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    }
    await secureStorage.removeToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
