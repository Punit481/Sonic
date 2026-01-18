-- CreateTable
CREATE TABLE "public"."UserInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "achievements" JSONB NOT NULL,
    "trends" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "nextSteps" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canRegenerateAfter" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserInsight_userId_idx" ON "public"."UserInsight"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserInsight" ADD CONSTRAINT "UserInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
