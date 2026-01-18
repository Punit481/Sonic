-- CreateEnum
CREATE TYPE "public"."Intensity" AS ENUM ('easy', 'moderate', 'hard', 'max');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false;
