CREATE TYPE "NoticeStatus" AS ENUM ('active', 'archived');

CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "status" "NoticeStatus" NOT NULL DEFAULT 'active',
    "publish_at" TIMESTAMP(3),
    "sort_at" TIMESTAMP(3) NOT NULL,
    "attachment_key" TEXT,
    "attachment_name" TEXT,
    "attachment_type" TEXT,
    "attachment_size" INTEGER,
    "published_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notice_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "User"("email_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Notice_status_sort_at_id_idx" ON "Notice"("status", "sort_at", "id");
CREATE INDEX "Notice_published_by_status_sort_at_id_idx" ON "Notice"("published_by", "status", "sort_at", "id");
