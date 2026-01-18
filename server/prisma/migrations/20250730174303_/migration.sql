/*
  Warnings:

  - The `intensity` column on the `ExerciseSet` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ExerciseSet" DROP COLUMN "intensity",
ADD COLUMN     "intensity" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "toProcess" TEXT;

-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "intensity" INTEGER;

-- DropEnum
DROP TYPE "Intensity";
