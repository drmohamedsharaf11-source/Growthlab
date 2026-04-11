import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

type RouteContext = { params: { id: string } };

export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === Role.CLIENT && session.user.clientId !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.alert.updateMany({
      where: { clientId: params.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH read-all alerts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
