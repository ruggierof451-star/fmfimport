-- Nuove sezioni di gioco: Yu-Gi-Oh! e Dragon Ball. Aggiunge anche l'inglese come lingua/edizione,
-- usata da entrambi (es. OCG giapponese vs edizione inglese).
ALTER TYPE "Game" ADD VALUE 'YUGIOH';
ALTER TYPE "Game" ADD VALUE 'DRAGON_BALL';
ALTER TYPE "Language" ADD VALUE 'EN';
