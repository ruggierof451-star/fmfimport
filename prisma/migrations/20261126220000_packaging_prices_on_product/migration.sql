-- Ripensata la scelta della confezione per i booster box giapponesi: non più prodotti
-- "gemelli" separati per ogni confezione, ma un prezzo alternativo opzionale sullo stesso
-- prodotto, selezionabile direttamente nella scheda prodotto.
ALTER TABLE "Product" DROP COLUMN "packaging";
ALTER TABLE "Product" ADD COLUMN "noWrapPriceCents" INTEGER;
ALTER TABLE "Product" ADD COLUMN "damagedPriceCents" INTEGER;

-- Il tipo enum "PackagingCondition" resta: ora descrive la confezione scelta per riga
-- d'ordine (storico), non più uno stato fisso del prodotto.
ALTER TABLE "OrderItem" ADD COLUMN "packagingSnapshot" "PackagingCondition";
