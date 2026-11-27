-- Limite di utilizzi per singolo cliente (account o email ospite), oltre al limite totale già esistente.
ALTER TABLE "DiscountCode" ADD COLUMN "maxUsesPerUser" INTEGER;
