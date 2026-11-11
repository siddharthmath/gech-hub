CREATE TABLE "Resolution" (
    "post_id" TEXT NOT NULL,
    "claim_id" TEXT NOT NULL,
    "note" TEXT,
    "resolved_by" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("post_id")
);

CREATE UNIQUE INDEX "Resolution_claim_id_key" ON "Resolution"("claim_id");
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "FoundPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "User"("email_id") ON DELETE RESTRICT ON UPDATE CASCADE;
