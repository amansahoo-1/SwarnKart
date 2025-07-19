-- AlterTable
ALTER TABLE "_DiscountToUser" ADD CONSTRAINT "_DiscountToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_DiscountToUser_AB_unique";
