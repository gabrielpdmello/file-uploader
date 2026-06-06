/*
  Warnings:

  - Made the column `size` on table `Folder` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Folder" ALTER COLUMN "size" SET NOT NULL,
ALTER COLUMN "size" SET DEFAULT 0;
