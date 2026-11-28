-- Disponibilità del prodotto: false = in magazzino (default per tutti i prodotti esistenti), true = su ordinazione.
ALTER TABLE "Product" ADD COLUMN "onOrder" BOOLEAN NOT NULL DEFAULT false;
