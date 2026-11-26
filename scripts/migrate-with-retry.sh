#!/bin/sh
# Neon (il database) va in pausa quando inattivo: il primo collegamento dopo una pausa a
# volte va in timeout (Prisma P1002) mentre il database si "risveglia". Invece di far
# fallire subito tutta la build, ritenta con una breve attesa crescente.
set -e

MAX_ATTEMPTS=5
ATTEMPT=1
DELAY=5

until npx prisma migrate deploy; do
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "migrate deploy: falliti $MAX_ATTEMPTS tentativi, interrompo la build."
    exit 1
  fi
  echo "migrate deploy: tentativo $ATTEMPT fallito (probabile risveglio del database), riprovo tra ${DELAY}s..."
  sleep "$DELAY"
  ATTEMPT=$((ATTEMPT + 1))
  DELAY=$((DELAY * 2))
done
