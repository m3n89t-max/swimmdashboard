-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventNo" INTEGER NOT NULL,
    "eventName" TEXT NOT NULL,
    "heatNo" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Lane" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "lane" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "team" TEXT NOT NULL,
    "record" TEXT,
    "rank" INTEGER,
    "status" TEXT,
    CONSTRAINT "Lane_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Event_eventNo_heatNo_key" ON "Event"("eventNo", "heatNo");

-- CreateIndex
CREATE UNIQUE INDEX "Lane_eventId_lane_key" ON "Lane"("eventId", "lane");
