export type User = {
  id: number;
  email: string;
  public_key: string;
  encrypted_private_key: string;
  private_key_salt: string;
  private_key_iv: string;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type SecureFile = {
  id: number;
  original_name: string;
  content_type: string;
  size: number;
  encryption_iv: string;
  encryption_salt: string;
  encryption_mode: "symmetric" | "asymmetric";
  wrapped_key: string;
  checksum: string;
  created_at: string;
};

export type ShareLink = {
  token: string;
  url: string;
};
