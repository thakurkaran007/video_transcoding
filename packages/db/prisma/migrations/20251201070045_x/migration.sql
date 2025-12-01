/*
  Warnings:

  - You are about to drop the `Balance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Merchant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OnRampTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `merchantAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `p2pTranfer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `userAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "VIDEO_PROGRESS_STATUS" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'QUEUED');

-- CreateEnum
CREATE TYPE "REDIS_KEYS" AS ENUM ('VIDEO_PROCESSING_QUEUE', 'VIDEO_PROCESSING_COUNT');

-- DropForeignKey
ALTER TABLE "public"."Balance" DROP CONSTRAINT "Balance_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OnRampTransaction" DROP CONSTRAINT "OnRampTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."merchantAccount" DROP CONSTRAINT "merchantAccount_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."p2pTranfer" DROP CONSTRAINT "p2pTranfer_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "public"."p2pTranfer" DROP CONSTRAINT "p2pTranfer_senderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."userAccount" DROP CONSTRAINT "userAccount_userId_fkey";

-- DropTable
DROP TABLE "public"."Balance";

-- DropTable
DROP TABLE "public"."Merchant";

-- DropTable
DROP TABLE "public"."OnRampTransaction";

-- DropTable
DROP TABLE "public"."merchantAccount";

-- DropTable
DROP TABLE "public"."p2pTranfer";

-- DropTable
DROP TABLE "public"."userAccount";

-- DropEnum
DROP TYPE "public"."OnRamp";

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "objectKey" TEXT NOT NULL,
    "subtitleUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'mp4',
    "userId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "videoResolutions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "progress" "VIDEO_PROGRESS_STATUS" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_objectKey_key" ON "Video"("objectKey");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
