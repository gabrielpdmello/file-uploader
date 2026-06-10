/*
  Warnings:

  - A unique constraint covering the columns `[item_id]` on the table `job_logs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "job_logs_item_id_key" ON "job_logs"("item_id");
