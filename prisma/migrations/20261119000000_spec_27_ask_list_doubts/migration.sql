CREATE TABLE "Doubt" (
    "id" TEXT NOT NULL,
    "notice_id" TEXT NOT NULL,
    "asker_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Doubt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoubtResponse" (
    "doubt_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "responded_by" TEXT NOT NULL,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DoubtResponse_pkey" PRIMARY KEY ("doubt_id")
);

CREATE INDEX "Doubt_notice_id_created_at_id_idx" ON "Doubt"("notice_id", "created_at", "id");
CREATE INDEX "Doubt_asker_id_created_at_id_idx" ON "Doubt"("asker_id", "created_at", "id");
ALTER TABLE "Doubt" ADD CONSTRAINT "Doubt_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Doubt" ADD CONSTRAINT "Doubt_asker_id_fkey" FOREIGN KEY ("asker_id") REFERENCES "User"("email_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoubtResponse" ADD CONSTRAINT "DoubtResponse_doubt_id_fkey" FOREIGN KEY ("doubt_id") REFERENCES "Doubt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoubtResponse" ADD CONSTRAINT "DoubtResponse_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "User"("email_id") ON DELETE RESTRICT ON UPDATE CASCADE;
