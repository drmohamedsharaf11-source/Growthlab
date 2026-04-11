import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { syncTikTokCreatives } from "@/lib/tiktok";
import { getPeriodDateRange } from "@/lib/reports";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clientId } = await request.json();

    if (session.user.role === Role.CLIENT && session.user.clientId !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { adAccounts: { where: { platform: "TIKTOK" } } },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!client.tiktokAccountId || !client.tiktokAccessToken) {
      return NextResponse.json(
        { error: "TikTok credentials not configured for this client" },
        { status: 400 }
      );
    }

    let adAccount = client.adAccounts[0];
    if (!adAccount) {
      adAccount = await prisma.adAccount.create({
        data: {
          clientId: client.id,
          platform: "TIKTOK",
          accountId: client.tiktokAccountId,
        },
      });
    }

    const dateRange = getPeriodDateRange("MONTHLY");
    const creatives = await syncTikTokCreatives(
      client.tiktokAccountId,
      client.tiktokAccessToken,
      dateRange
    );

    // Dedup: remove today's TikTok creatives before inserting fresh ones
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.creative.deleteMany({
      where: {
        adAccountId: adAccount.id,
        date: { gte: today },
      },
    });

    let synced = 0;
    for (const creative of creatives) {
      await prisma.creative.create({
        data: {
          ...creative,
          adAccountId: adAccount.id,
          date: new Date(),
        },
      });
      synced++;
    }

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error("TikTok sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TikTok sync failed" },
      { status: 500 }
    );
  }
}
