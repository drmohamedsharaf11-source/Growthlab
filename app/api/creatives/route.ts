import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getPeriodDateRange } from "@/lib/reports";
import { Period } from "@/types";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "MONTHLY") as Period;
  const clientId = searchParams.get("clientId");

  let targetClientId: string | null = null;
  if (session.user.role === Role.ADMIN) {
    targetClientId = clientId;
  } else {
    targetClientId = session.user.clientId;
  }

  if (!targetClientId) {
    return NextResponse.json({ error: "No client selected" }, { status: 400 });
  }

  const dateRange = getPeriodDateRange(period);

  try {
    const creatives = await prisma.creative.findMany({
      where: {
        adAccount: { clientId: targetClientId },
        date: { gte: dateRange.start, lte: dateRange.end },
      },
      orderBy: { roas: "desc" },
    });

    return NextResponse.json(creatives);
  } catch (error) {
    console.error("GET /api/creatives error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
