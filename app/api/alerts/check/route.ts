import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { computeSellThrough } from "@/lib/sellthrough";
import { AlertType, Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  const session = await auth();
  // Allow cron secret auth too
  const cronSecret = request.headers.get("x-cron-secret");
  const isValidCron = cronSecret === process.env.CRON_SECRET;

  if (!isValidCron && !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const clientId = body.clientId;

    // Build client query
    const clientWhere = clientId ? { id: clientId } : { status: "ACTIVE" as const };
    if (session?.user?.role === Role.CLIENT) {
      if (!session.user.clientId) {
        return NextResponse.json({ error: "No client associated" }, { status: 400 });
      }
      Object.assign(clientWhere, { id: session.user.clientId });
    }

    const clients = await prisma.client.findMany({
      where: clientWhere,
      include: {
        products: {
          include: { variants: true },
          orderBy: { totalSold: "desc" },
          take: 4,
        },
      },
    });

    let totalAlertsCreated = 0;

    for (const client of clients) {
      for (const product of client.products) {
        for (const variant of product.variants) {
          const sellThrough = computeSellThrough(variant);

          const variantInfo = [variant.size, variant.color]
            .filter(Boolean)
            .join(" / ");

          // Check each alert type with deduplication
          const alertChecks: Array<{ type: AlertType; threshold: number; message: string }> = [
            {
              type: AlertType.OUT_OF_STOCK,
              threshold: 100,
              message: `${product.name} (${variantInfo}) is OUT OF STOCK. ${variant.sold} units sold, 0 remaining.`,
            },
            {
              type: AlertType.SELLTHROUGH_70,
              threshold: 70,
              message: `${product.name} (${variantInfo}) has reached ${sellThrough.toFixed(0)}% sell-through. Only ${variant.stockLeft} units left.`,
            },
            {
              type: AlertType.SELLTHROUGH_50,
              threshold: 50,
              message: `${product.name} (${variantInfo}) has reached ${sellThrough.toFixed(0)}% sell-through. ${variant.stockLeft} units remaining.`,
            },
            {
              type: AlertType.SELLTHROUGH_25,
              threshold: 25,
              message: `${product.name} (${variantInfo}) has reached ${sellThrough.toFixed(0)}% sell-through (early warning). ${variant.stockLeft} units remaining.`,
            },
          ];

          for (const check of alertChecks) {
            let shouldAlert = false;

            if (check.type === AlertType.OUT_OF_STOCK && variant.stockLeft === 0) {
              shouldAlert = true;
            } else if (check.type !== AlertType.OUT_OF_STOCK && sellThrough >= check.threshold) {
              shouldAlert = true;
            }

            if (shouldAlert) {
              // Dedup: check for existing unread alert of this type for this variant
              const existing = await prisma.alert.findFirst({
                where: {
                  clientId: client.id,
                  type: check.type,
                  productName: product.name,
                  variantInfo,
                  read: false,
                },
              });

              if (!existing) {
                await prisma.alert.create({
                  data: {
                    clientId: client.id,
                    type: check.type,
                    productName: product.name,
                    variantInfo,
                    message: check.message,
                  },
                });
                totalAlertsCreated++;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      alertsCreated: totalAlertsCreated,
    });
  } catch (error) {
    console.error("Alert check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Alert check failed" },
      { status: 500 }
    );
  }
}
