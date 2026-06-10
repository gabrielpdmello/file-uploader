/*
  Warnings:

  - A unique constraint covering the columns `[item_id]` on the table `scheduled_jobs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "scheduled_jobs_item_id_key" ON "scheduled_jobs"("item_id");
