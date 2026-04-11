import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

type RouteContext = { params: { alertId: string } };

export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await prisma.alert.findUnique({ where: { id: params.alertId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // CLIENT users can only mark alerts for their own client
    if (session.user.role === Role.CLIENT && existing.clientId !== session.user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const alert = await prisma.alert.update({
      where: { id: params.alertId },
      data: { read: true },
    });
    return NextResponse.json(alert);
  } catch (error) {
    console.error("PATCH alert read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
