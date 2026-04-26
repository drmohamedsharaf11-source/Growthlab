-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "shopifyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopifyLineId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "orderedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientId_shopifyId_key" ON "Order"("clientId", "shopifyId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLineItem_orderId_shopifyLineId_key" ON "OrderLineItem"("orderId", "shopifyLineId");

-- CreateIndex
CREATE INDEX "OrderLineItem_orderedAt_idx" ON "OrderLineItem"("orderedAt");

-- CreateIndex
CREATE INDEX "OrderLineItem_productId_orderedAt_idx" ON "OrderLineItem"("productId", "orderedAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
