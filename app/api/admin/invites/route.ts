import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const clientName = body.clientName?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!clientName || !email) {
      return NextResponse.json(
        { error: "clientName and email are required" },
        { status: 400 }
      );
    }

    // Create an empty client record for this invitee
    const client = await prisma.client.create({ data: { name: clientName } });

    // Generate a secure random token valid for 7 days
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.invite.create({
      data: {
        token,
        email,
        clientId: client.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "";
    return NextResponse.json(
      { inviteUrl: `${baseUrl}/onboard/${token}`, clientId: client.id, email },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("POST /api/admin/invites error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
