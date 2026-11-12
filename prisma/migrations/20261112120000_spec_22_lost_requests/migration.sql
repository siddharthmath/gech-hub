CREATE TABLE "LostRequest" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location_lost" TEXT,
    "lost_on" DATE,
    "status" "PostStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LostRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LostRequest_status_created_at_id_idx" ON "LostRequest"("status", "created_at", "id");
CREATE INDEX "LostRequest_requester_id_status_created_at_id_idx" ON "LostRequest"("requester_id", "status", "created_at", "id");
ALTER TABLE "LostRequest" ADD CONSTRAINT "LostRequest_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "User"("email_id") ON DELETE CASCADE ON UPDATE CASCADE;
