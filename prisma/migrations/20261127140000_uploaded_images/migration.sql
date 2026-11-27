-- Foto prodotto conservate nel database: non dipendono da archivi esterni e non spariscono.
CREATE TABLE "UploadedImage" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id")
);
