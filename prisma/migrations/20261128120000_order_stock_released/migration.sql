-- Scorte impegnate alla creazione dell'ordine e restituite su annullamento/rimborso/pagamento
-- fallito. Il flag evita doppie restituzioni.
ALTER TABLE "Order" ADD COLUMN "stockReleased" BOOLEAN NOT NULL DEFAULT false;

-- Gli ordini già esistenti sono precedenti a questa logica: le loro scorte non erano state
-- impegnate, quindi li segniamo come "già restituite" per non aggiungere scorte fantasma se
-- vengono annullati in seguito.
UPDATE "Order" SET "stockReleased" = true;
