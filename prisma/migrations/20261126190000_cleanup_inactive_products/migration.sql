-- Pulizia catalogo su richiesta: il catalogo verrà ripopolato a mano dall'admin, prodotto
-- per prodotto. Elimina DEFINITIVAMENTE i prodotti non attivi (non pubblicati, archiviati o
-- già eliminati "soft") — qualunque sia la loro origine (seed iniziale, importazione di prova,
-- ecc.). I prodotti PUBBLICATI non vengono toccati.
--
-- Per sicurezza, non tocca MAI un prodotto che compare in almeno un ordine reale (OrderItem):
-- lo storico ordini deve restare consultabile anche se il prodotto collegato non è più in
-- vendita.

-- 1) Scollega prima i riferimenti che bloccherebbero la cancellazione.
DELETE FROM "ProductChangeLog"
WHERE "productId" IN (
  SELECT p.id FROM "Product" p
  WHERE (p.published = false OR p.archived = true OR p."deletedAt" IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM "OrderItem" oi WHERE oi."productId" = p.id)
);

UPDATE "SupplierLink"
SET "productId" = NULL
WHERE "productId" IN (
  SELECT p.id FROM "Product" p
  WHERE (p.published = false OR p.archived = true OR p."deletedAt" IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM "OrderItem" oi WHERE oi."productId" = p.id)
);

-- 2) Elimina definitivamente i prodotti non attivi senza storico ordini.
DELETE FROM "Product" p
WHERE (p.published = false OR p.archived = true OR p."deletedAt" IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM "OrderItem" oi WHERE oi."productId" = p.id);
