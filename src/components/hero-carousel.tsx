"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export interface HeroSlide {
  slug: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

const AUTOPLAY_MS = 2600; // giro automatico ogni ~2,5 secondi
const RESUME_AFTER_SWIPE_MS = 6000; // dopo uno swipe riparte da sola dopo qualche secondo
const SWIPE_PX = 40;

/**
 * Vetrina dell'hero a "ruota": un prodotto davanti e due ai lati che girano da soli.
 * Col mouse sopra si ferma e si gira a mano (clic sui prodotti laterali, frecce o
 * pallini); su telefono e tablet si gira con lo swipe. Con "riduci movimento" attivo
 * nel sistema non gira da sola.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const n = slides.length;
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const [holdUntil, setHoldUntil] = useState(0);
  const [reduced, setReduced] = useState(false);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = useRef(false);

  const go = useCallback((to: number) => setActive(((to % n) + n) % n), [n]);
  const next = useCallback(() => setActive((a) => (a + 1) % n), [n]);
  const prev = useCallback(() => setActive((a) => (a - 1 + n) % n), [n]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (hover || reduced || n < 2) return;
    const wait = Math.max(0, holdUntil - Date.now());
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        if (document.visibilityState === "visible") setActive((a) => (a + 1) % n);
      }, AUTOPLAY_MS);
    }, wait);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [hover, reduced, n, holdUntil]);

  function slot(i: number): "center" | "right" | "left" | "hidden" {
    const d = (i - active + n) % n;
    if (d === 0) return "center";
    if (d === 1) return "right";
    if (d === n - 1) return "left";
    return "hidden";
  }

  return (
    <div
      className="hero-photos hero-wheel"
      role="region"
      aria-roledescription="carosello"
      aria-label="Prodotti in evidenza"
      // solo il mouse ferma la ruota: su touch "hover" resterebbe acceso dopo un tocco
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true;
          if (dx < 0) next();
          else prev();
          setHoldUntil(Date.now() + RESUME_AFTER_SWIPE_MS);
        }
      }}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      }}
    >
      <div className="glow" aria-hidden="true" />
      {slides.map((s, i) => {
        const pos = slot(i);
        return (
          <Link
            key={s.slug}
            href={`/prodotto/${s.slug}`}
            className={`ph wheel-${pos}`}
            aria-hidden={pos === "hidden" ? true : undefined}
            tabIndex={pos === "center" ? 0 : -1}
            draggable={false}
            onClick={(e) => {
              // dopo uno swipe non si apre il prodotto; i laterali vengono portati davanti
              if (swiped.current || pos !== "center") {
                e.preventDefault();
                if (!swiped.current && pos !== "hidden") go(i);
              }
              swiped.current = false;
            }}
          >
            <Image
              src={s.url}
              alt={s.name}
              width={s.width}
              height={s.height}
              style={{ height: "100%", width: "auto" }}
              draggable={false}
              sizes="(max-width: 760px) 260px, 380px"
              unoptimized={!s.url.startsWith("/")}
              priority={i === 0}
            />
          </Link>
        );
      })}
      <button type="button" className="wheel-arrow wheel-prev" aria-label="Prodotto precedente" onClick={prev}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <button type="button" className="wheel-arrow wheel-next" aria-label="Prodotto successivo" onClick={next}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div className="wheel-dots">
        {slides.map((s, i) => (
          <button
            key={s.slug}
            type="button"
            className={i === active ? "on" : undefined}
            aria-label={`Mostra ${s.name}`}
            aria-current={i === active ? "true" : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}
