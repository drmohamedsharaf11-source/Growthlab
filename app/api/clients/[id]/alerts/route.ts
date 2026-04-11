import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === Role.CLIENT && session.user.clientId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: { clientId: params.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("GET alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
