/*
  Warnings:

  - The `intensity` column on the `ExerciseSet` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."ExerciseSet" DROP COLUMN "intensity",
ADD COLUMN     "intensity" "public"."Intensity";
