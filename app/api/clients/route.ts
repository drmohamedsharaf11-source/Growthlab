import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (session.user.role === Role.ADMIN) {
      const clients = await prisma.client.findMany({
        include: {
          users: { select: { id: true, name: true, email: true, role: true, clientId: true, createdAt: true } },
          adAccounts: true,
          _count: { select: { products: true, alerts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(clients);
    } else {
      // CLIENT role: only return their own client
      if (!session.user.clientId) {
        return NextResponse.json([]);
      }
      const client = await prisma.client.findUnique({
        where: { id: session.user.clientId },
        include: {
          users: { select: { id: true, name: true, email: true, role: true, clientId: true, createdAt: true } },
          adAccounts: true,
        },
      });
      return NextResponse.json(client ? [client] : []);
    }
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      name,
      shopifyDomain,
      shopifyToken,
      metaAccountId,
      metaAccessToken,
      tiktokAccountId,
      tiktokAccessToken,
      reportFrequency,
      clientEmail,
      clientName,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name,
        shopifyDomain: shopifyDomain || null,
        shopifyToken: shopifyToken || null,
        metaAccountId: metaAccountId || null,
        metaAccessToken: metaAccessToken || null,
        tiktokAccountId: tiktokAccountId || null,
        tiktokAccessToken: tiktokAccessToken || null,
        reportFrequency: reportFrequency || "DAILY_WEEKLY_MONTHLY",
      },
    });

    // Create ad accounts if credentials provided
    if (metaAccountId && metaAccessToken) {
      await prisma.adAccount.create({
        data: {
          clientId: client.id,
          platform: "META",
          accountId: metaAccountId,
        },
      });
    }

    if (tiktokAccountId && tiktokAccessToken) {
      await prisma.adAccount.create({
        data: {
          clientId: client.id,
          platform: "TIKTOK",
          accountId: tiktokAccountId,
        },
      });
    }

    // Create client user if email provided
    if (clientEmail) {
      const existingUser = await prisma.user.findUnique({
        where: { email: clientEmail },
      });

      if (!existingUser) {
        const password = await bcrypt.hash("changeme123", 12);
        await prisma.user.create({
          data: {
            name: clientName || name,
            email: clientEmail,
            password,
            role: Role.CLIENT,
            clientId: client.id,
          },
        });
      } else {
        await prisma.user.update({
          where: { email: clientEmail },
          data: { clientId: client.id },
        });
      }
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
