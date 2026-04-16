import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import type { Session } from "next-auth";

/**
 * Returns the session or throws a 401 NextResponse.
 * API routes must catch Response instances: catch (e) { if (e instanceof Response) return e }
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

/**
 * Returns the session or throws 401/403 NextResponse.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== Role.ADMIN) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session;
}

/**
 * Returns a Prisma `where` clause scoped to the session user.
 * - ADMIN  → {} (sees all clients)
 * - CLIENT → { id: clientId }
 * - CLIENT with no clientId → null (misconfigured — caller should return 403)
 */
export function getClientScope(
  session: Session
): { id: string } | Record<string, never> | null {
  if (session.user.role === Role.ADMIN) return {};
  if (!session.user.clientId) return null;
  return { id: session.user.clientId };
}
