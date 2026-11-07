CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "email_domain" TEXT NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "team_id" TEXT NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
