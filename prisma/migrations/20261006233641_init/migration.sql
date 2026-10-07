-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierCode" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "setCode" TEXT,
    "type" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'NEW',
    "imageUrl" TEXT,
    "supplierCostCents" INTEGER,
    "costVatTreatment" TEXT NOT NULL DEFAULT 'NET_OF_VAT',
    "costIsEstimated" BOOLEAN NOT NULL DEFAULT true,
    "vatRateBps" INTEGER NOT NULL DEFAULT 2200,
    "stockQty" INTEGER,
    "stockLastCheckedAt" DATETIME,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isPreorder" BOOLEAN NOT NULL DEFAULT false,
    "matchStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "supplierLinkId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierCode" TEXT,
    "supplierName" TEXT NOT NULL,
    "costCents" INTEGER,
    "costVatTreatment" TEXT NOT NULL DEFAULT 'NET_OF_VAT',
    "stockQty" INTEGER,
    "sourceUrl" TEXT,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT,
    "matchConfidence" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductChangeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductChangeLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trigger" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unavailableCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "triggeredBy" TEXT
);

-- CreateTable
CREATE TABLE "SyncError" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncLogId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncError_syncLogId_fkey" FOREIGN KEY ("syncLogId") REFERENCES "SyncLog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "marginBps" INTEGER NOT NULL DEFAULT 3000,
    "marginBulkBps" INTEGER NOT NULL DEFAULT 2000,
    "bulkThresholdQty" INTEGER NOT NULL DEFAULT 10,
    "defaultVatRateBps" INTEGER NOT NULL DEFAULT 2200,
    "roundTo90Cents" BOOLEAN NOT NULL DEFAULT true,
    "freeShippingThresholdCents" INTEGER NOT NULL DEFAULT 20000,
    "standardShippingFeeCents" INTEGER NOT NULL DEFAULT 790,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "companyName" TEXT,
    "vatNumber" TEXT,
    "sdiCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "fullName" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IT',
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "guestEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "shipName" TEXT NOT NULL,
    "shipStreet" TEXT NOT NULL,
    "shipPostal" TEXT NOT NULL,
    "shipCity" TEXT NOT NULL,
    "shipProvince" TEXT NOT NULL,
    "shipCountry" TEXT NOT NULL DEFAULT 'IT',
    "shipPhone" TEXT,
    "invoiceRequested" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT,
    "vatNumber" TEXT,
    "sdiCode" TEXT,
    "customerNote" TEXT,
    "trackingCarrier" TEXT,
    "trackingNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "unitPriceCentsSnapshot" INTEGER NOT NULL,
    "supplierCostCentsSnapshot" INTEGER,
    "quantity" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "changedBy" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_supplierLinkId_key" ON "Product"("supplierLinkId");

-- CreateIndex
CREATE INDEX "Product_game_language_category_idx" ON "Product"("game", "language", "category");

-- CreateIndex
CREATE INDEX "Product_published_idx" ON "Product"("published");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierLink_productId_key" ON "SupplierLink"("productId");

-- CreateIndex
CREATE INDEX "SupplierLink_supplierCode_idx" ON "SupplierLink"("supplierCode");

-- CreateIndex
CREATE INDEX "ProductChangeLog_productId_idx" ON "ProductChangeLog"("productId");

-- CreateIndex
CREATE INDEX "SyncError_syncLogId_idx" ON "SyncError"("syncLogId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");
