import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { domain, token } = body as { domain?: string; token?: string };

  if (!domain || !token) {
    return NextResponse.json({ error: "Missing domain or token" }, { status: 400 });
  }

  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  try {
    const res = await fetch(
      `https://${cleanDomain}/admin/api/2024-01/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, error: res.status === 401 ? "Invalid access token" : `Shopify returned ${res.status}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const shopName = data.shop?.name || cleanDomain;
    return NextResponse.json({ ok: true, shopName });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not reach Shopify store" }, { status: 200 });
  }
}
