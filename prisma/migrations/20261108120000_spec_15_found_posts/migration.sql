CREATE TYPE "PostStatus" AS ENUM ('active', 'archived');

CREATE TABLE "FoundPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location_found" TEXT,
    "found_on" DATE,
    "status" "PostStatus" NOT NULL DEFAULT 'active',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "posted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FoundPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FoundPostImage" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "FoundPostImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FoundPost_status_created_at_id_idx" ON "FoundPost"("status", "created_at", "id");
CREATE INDEX "FoundPostImage_post_id_position_idx" ON "FoundPostImage"("post_id", "position");
ALTER TABLE "FoundPost" ADD CONSTRAINT "FoundPost_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "User"("email_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FoundPostImage" ADD CONSTRAINT "FoundPostImage_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "FoundPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
