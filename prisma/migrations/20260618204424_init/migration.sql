-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('Going', 'Pending', 'Declined', 'Waitlist');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "locationText" TEXT,
    "placeId" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "coverUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT,
    "capacity" INTEGER,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "hideLocation" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "status" "RsvpStatus" NOT NULL DEFAULT 'Going',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_ownerId_idx" ON "Event"("ownerId");

-- CreateIndex
CREATE INDEX "Rsvp_eventId_idx" ON "Rsvp"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_eventId_userId_key" ON "Rsvp"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
