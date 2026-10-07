import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma";

const COOKIE_NAME = "fmf_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 giorni

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET non configurata (o troppo corta). Impostala in .env prima di avviare l'app."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  role: Role;
  email: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Il cookie "secure" richiede HTTPS: su Vercel/hosting reale arriva sempre con
 * x-forwarded-proto=https, mentre in locale (dev o test da telefono via IP di rete,
 * sempre http semplice) questo header manca. Usarlo invece di NODE_ENV fa sì che il
 * login funzioni sia in locale sia online, senza bisogno di toccare questo codice
 * quando il sito va in produzione dietro HTTPS.
 */
async function isSecureRequest(): Promise<boolean> {
  const h = await headers();
  return h.get("x-forwarded-proto") === "https";
}

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: await isSecureRequest(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.role === "string" &&
      typeof payload.email === "string"
    ) {
      return { userId: payload.userId, role: payload.role as Role, email: payload.email };
    }
    return null;
  } catch {
    return null; // token scaduto, manomesso, o firmato con un'altra chiave
  }
}

/** Ricarica l'utente dal database (fonte di verità), non fidarsi solo del contenuto del cookie. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
