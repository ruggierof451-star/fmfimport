-- Aggiunge l'italiano come lingua/edizione (sezione "Pokémon Italiano").
ALTER TYPE "Language" ADD VALUE 'IT';

-- Stato confezione per i box giapponesi venduti in più varianti (sigillato / senza
-- pellicola / danneggiato), ognuna con un prezzo proprio.
CREATE TYPE "PackagingCondition" AS ENUM ('SEALED', 'NO_WRAP', 'DAMAGED');

ALTER TABLE "Product" ADD COLUMN "packaging" "PackagingCondition" NOT NULL DEFAULT 'SEALED';
