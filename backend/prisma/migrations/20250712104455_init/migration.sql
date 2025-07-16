-- Enums
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'MANAGER', 'SUPPORT');
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- Admin
CREATE TABLE "Admin" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SUPERADMIN',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- User
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "address" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" INTEGER,
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Discount
CREATE TABLE "Discount" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "validTill" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");

-- Discount-User Join Table
CREATE TABLE "_DiscountToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_DiscountToUser_AB_unique" ON "_DiscountToUser"("A", "B");
CREATE INDEX "_DiscountToUser_B_index" ON "_DiscountToUser"("B");

-- Product
CREATE TABLE "Product" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Order
CREATE TABLE "Order" (
    "id" SERIAL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "adminId" INTEGER,
    "discountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- OrderItem
CREATE TABLE "OrderItem" (
    "id" SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Cart
CREATE TABLE "Cart" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CartItem
CREATE TABLE "CartItem" (
    "id" SERIAL PRIMARY KEY,
    "cartId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Wishlist
CREATE TABLE "Wishlist" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Wishlist-Product Join Table
CREATE TABLE "_WishlistToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_WishlistToProduct_AB_unique" ON "_WishlistToProduct"("A", "B");
CREATE INDEX "_WishlistToProduct_B_index" ON "_WishlistToProduct"("B");

-- Review
CREATE TABLE "Review" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);


-- Inquiry
CREATE TABLE "Inquiry" (
    "id" SERIAL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "adminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- InventoryLog
CREATE TABLE "InventoryLog" (
    "id" SERIAL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "change" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Report
CREATE TABLE "Report" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Setting
CREATE TABLE "Setting" (
    "id" SERIAL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "adminId" INTEGER,
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Invoice
CREATE TABLE "Invoice" (
    "id" SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
