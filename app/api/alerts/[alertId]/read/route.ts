import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type RouteContext = { params: { alertId: string } };

export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
