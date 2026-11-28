import type { Prisma, PrismaClient } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

/**
 * Gestione delle scorte legate agli ordini.
 *
 * Regola: le scorte si scalano quando l'ordine viene creato (così non si vende più della
 * disponibilità, anche mentre si attende il pagamento) e si restituiscono se l'ordine
 * viene annullato, rimborsato o se il pagamento fallisce. Un flag sull'ordine
 * (`stockReleased`) garantisce che la restituzione avvenga una sola volta.
 *
 * Solo il PRODOTTO PRINCIPALE usa le scorte: le varianti (es. "busta singola") sono
 * considerate illimitate, quindi non toccano `Product.stockQty`. I prodotti con
 * `stockQty = null` non tracciano la disponibilità e non vengono mai scalati.
 */

type TxClient = Prisma.TransactionClient | PrismaClient;

export interface ReservableLine {
  productId: string;
  variantId: string | null;
  quantity: number;
  /** Disponibilità attuale del prodotto principale (null = non tracciata). */
  stockQty: number | null;
}

/**
 * Scala le scorte dei prodotti principali dentro la transazione dell'ordine. Se nel
 * frattempo la disponibilità è scesa sotto la quantità richiesta (due ordini in parallelo),
 * lancia un errore: la transazione viene annullata e l'ordine non viene creato.
 */
export async function reserveStockInTx(tx: TxClient, lines: ReservableLine[]): Promise<void> {
  for (const line of lines) {
    if (line.variantId || line.stockQty == null) continue; // varianti e prodotti non tracciati: nessuno scalo
    const claimed = await tx.product.updateMany({
      where: { id: line.productId, stockQty: { gte: line.quantity } },
      data: { stockQty: { decrement: line.quantity } },
    });
    if (claimed.count === 0) {
      throw new OutOfStockError(line.productId);
    }
  }
}

export class OutOfStockError extends Error {
  constructor(public productId: string) {
    super("Scorte insufficienti");
    this.name = "OutOfStockError";
  }
}

/**
 * Restituisce le scorte di un ordine (annullato/rimborsato/pagamento fallito), una sola
 * volta. Il flag `stockReleased` viene alzato in modo atomico: se era già alzato non fa
 * nulla, così non si aggiungono scorte due volte.
 */
export async function releaseOrderStock(orderId: string): Promise<void> {
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, stockReleased: false },
    data: { stockReleased: true },
  });
  if (claimed.count === 0) return; // già restituite

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });
  for (const it of items) {
    if (it.variantId || !it.productId) continue;
    await prisma.product.updateMany({
      where: { id: it.productId, stockQty: { not: null } },
      data: { stockQty: { increment: it.quantity } },
    });
  }
}

/**
 * Re-impegna le scorte di un ordine che era stato annullato e viene riportato attivo
 * (es. l'admin annulla per sbaglio e poi ripristina). Scala di nuovo le quantità, senza
 * scendere sotto zero. Alza il flag `stockReleased` a false in modo atomico.
 */
export async function reReserveOrderStock(orderId: string): Promise<void> {
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, stockReleased: true },
    data: { stockReleased: false },
  });
  if (claimed.count === 0) return; // non era stato restituito: scorte ancora impegnate

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });
  for (const it of items) {
    if (it.variantId || !it.productId) continue;
    // Read-modify-write per non scendere sotto zero (riattivazione: evento raro).
    const p = await prisma.product.findUnique({ where: { id: it.productId }, select: { stockQty: true } });
    if (!p || p.stockQty == null) continue;
    await prisma.product.update({ where: { id: it.productId }, data: { stockQty: Math.max(0, p.stockQty - it.quantity) } });
  }
}

/** Stati in cui le scorte vanno restituite. */
export function isStockReleasingStatus(status: string): boolean {
  return status === "CANCELLED" || status === "REFUNDED";
}
