import type { User } from "@/lib/api/types";

/** What the auth route handlers return to the browser (access token in memory). */
export interface AuthSession {
  user: User;
  accessToken: string;
  accessExp: number;
}
