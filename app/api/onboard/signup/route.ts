import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token?.trim();
    const name = body.name?.trim();
    const password = body.password;

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: "token, name, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate invite
    const invite = await prisma.invite.findUnique({ where: { token } });

    if (!invite) {
      return NextResponse.json(
        { error: "This invite link is invalid or has expired" },
        { status: 400 }
      );
    }
    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invite link has already been used" },
        { status: 400 }
      );
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invite link has expired" },
        { status: 400 }
      );
    }

    // Prevent duplicate accounts
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 400 }
      );
    }

    // Create user
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        name,
        email: invite.email,
        password: hashed,
        role: Role.CLIENT,
        clientId: invite.clientId,
      },
    });

    // Mark invite as used
    await prisma.invite.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ success: true, email: invite.email });
  } catch (e) {
    console.error("POST /api/onboard/signup error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
