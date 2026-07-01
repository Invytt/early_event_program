-- DropForeignKey / DropTable: replace open Q&A (Question/Answer) with responses
DROP TABLE IF EXISTS "Answer";
DROP TABLE IF EXISTS "Question";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "questionnaire" JSONB;

-- CreateTable
CREATE TABLE "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_eventId_idx" ON "QuestionnaireResponse"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireResponse_eventId_userId_key" ON "QuestionnaireResponse"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
