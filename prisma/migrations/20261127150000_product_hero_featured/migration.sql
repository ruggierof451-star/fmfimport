-- Prodotti scelti per la vetrina a ruota della home (massimo 3, controllato dall'admin).
ALTER TABLE "Product" ADD COLUMN "heroFeatured" BOOLEAN NOT NULL DEFAULT false;
