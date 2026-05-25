import { api } from "./client";
import type { AuthResponse, User } from "../types";

export type UserKeyPayload = {
  public_key: string;
  encrypted_private_key: string;
  private_key_salt: string;
  private_key_iv: string;
};

export function register(email: string, password: string, keyPayload: UserKeyPayload): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password, ...keyPayload }),
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export function getMe(): Promise<User> {
  return api<User>("/auth/me");
}

export function updateKeys(keyPayload: UserKeyPayload): Promise<User> {
  return api<User>("/auth/keys", {
    method: "PUT",
    body: JSON.stringify(keyPayload),
  });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return api<{ message: string }>("/auth/password/forgot", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return api<{ message: string }>("/auth/password/reset", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ token, password }),
  });
}
