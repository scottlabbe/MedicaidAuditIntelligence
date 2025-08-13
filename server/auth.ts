import { createHmac } from "crypto";

export class HMACAuth {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.INTERNAL_API_SECRET || "default-dev-secret-key-change-in-production";
    if (!this.secret) {
      throw new Error("INTERNAL_API_SECRET environment variable is required");
    }
  }

  generateToken(timestamp: string, path: string): string {
    const body = `${timestamp}${path}`;
    return createHmac("sha256", this.secret).update(body).digest("hex");
  }

  verifyToken(token: string, timestamp: string, path: string): boolean {
    const expectedToken = this.generateToken(timestamp, path);
    return this.compareHmac(token, expectedToken);
  }

  private compareHmac(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  createAuthHeader(path: string): string {
    const timestamp = Date.now().toString();
    const token = this.generateToken(timestamp, path);
    return `Bearer ${token}::${timestamp}`;
  }
}

export const hmacAuth = new HMACAuth();
