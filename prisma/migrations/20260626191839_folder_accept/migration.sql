-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "accept_file" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "accept_folder" BOOLEAN NOT NULL DEFAULT true;
