-- CreateEnum
CREATE TYPE "AppUsage" AS ENUM ('PERSONAL', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "appUsage" "AppUsage",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "whatsapp" TEXT;
