"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";

import { getCurrentUser, login as loginRequest, logout as logoutRequest } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import type { LoginPayload, SessionUser } from "@/lib/types";

type AuthContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<SessionUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      queryClient.setQueryData(["auth", "me"], result.user);
      toastSuccess("Welcome back. You are now signed in.", "Signed In");
    },
    onError: (error: unknown) => {
      toastError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  });

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      toastSuccess("You have signed out successfully.", "Signed Out");
    },
    onError: (error: unknown) => {
      toastError(error instanceof Error ? error.message : "Unable to sign out.");
    },
    onSettled: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.removeQueries({ queryKey: ["resource"] });
    }
  });

  const value: AuthContextValue = {
    user: me.data ?? null,
    isLoading: me.isLoading || loginMutation.isPending,
    login: async (payload) => {
      const result = await loginMutation.mutateAsync(payload);
      return result.user;
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
