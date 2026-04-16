import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireAuth, getClientScope } from "@/lib/auth-helpers";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAuth();

    const scope = getClientScope(session);

    // CLIENT with no clientId is misconfigured
    if (scope === null) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // CLIENT can only access their own alerts
    if (session.user.role === Role.CLIENT && session.user.clientId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const alerts = await prisma.alert.findMany({
      where: { clientId: params.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(alerts);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("GET alerts error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
