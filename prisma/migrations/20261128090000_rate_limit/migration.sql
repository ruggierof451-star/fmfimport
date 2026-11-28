-- Conteggio tentativi per finestra temporale (anti brute force su login, registrazione,
-- recupero password). Condiviso tra le funzioni serverless tramite il database.
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
