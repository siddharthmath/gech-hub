CREATE TYPE "Decision" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "claimant_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "decision" "Decision" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Claim_post_id_claimant_id_key" ON "Claim"("post_id", "claimant_id");
CREATE INDEX "Claim_post_id_created_at_id_idx" ON "Claim"("post_id", "created_at", "id");
CREATE INDEX "Claim_claimant_id_created_at_id_idx" ON "Claim"("claimant_id", "created_at", "id");
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "FoundPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_claimant_id_fkey" FOREIGN KEY ("claimant_id") REFERENCES "User"("email_id") ON DELETE CASCADE ON UPDATE CASCADE;
