CREATE TYPE "Role" AS ENUM ('admin', 'student', 'faculty', 'office_staff');

ALTER TABLE "User" DROP CONSTRAINT "User_teamId_fkey";
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role"
  USING (CASE "role"::text
    WHEN 'ADMIN' THEN 'admin'
    WHEN 'STUDENT' THEN 'student'
    WHEN 'FACULTY' THEN 'faculty'
    WHEN 'OFFICE_STAFF' THEN 'office_staff'
  END)::"Role";
DROP TYPE "UserRole";

DROP INDEX "User_emailId_key";
ALTER TABLE "User" RENAME COLUMN "emailId" TO "email_id";
ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("email_id");
ALTER TABLE "User" ALTER COLUMN "phoneNumber" DROP NOT NULL;
ALTER TABLE "User" RENAME COLUMN "phoneNumber" TO "phone_number";
ALTER TABLE "User" ADD COLUMN "otp" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" DROP COLUMN "otpHash";
ALTER TABLE "User" ALTER COLUMN "otp" DROP DEFAULT;
ALTER TABLE "User" DROP COLUMN "teamId";
ALTER TABLE "User" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "User" RENAME COLUMN "updatedAt" TO "updated_at";
DROP TABLE "Team";

CREATE TABLE "LoginAttempt" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_role_created_at_email_id_idx" ON "User"("role", "created_at", "email_id");
CREATE INDEX "LoginAttempt_key_created_at_idx" ON "LoginAttempt"("key", "created_at");
