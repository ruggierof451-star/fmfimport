/**
 * Illustrazioni prodotto monocromatiche generate via SVG — porting 1:1 della funzione
 * `art()` del prototipo. Finché non arriva una foto reale dal fornitore, ogni prodotto
 * mostra un disegno stilizzato in base alla sua tipologia (booster box, tin, deck, ...).
 */
export interface ArtInput {
  type: string;
  code?: string | null;
  setName: string;
  game: "POKEMON" | "ONE_PIECE";
}

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export function cleanProductName(name: string): string {
  return name.replace(/\[.*?\]\s*/g, "");
}

export function productArt(p: ArtInput, opt: { dark?: boolean } = {}): string {
  const dark = !!opt.dark;
  const bg = dark ? "#000000" : "#FBFBFB";
  const st = dark ? "#8A8A8A" : "#C4C4C4";
  const face = dark ? "#121212" : "#FFFFFF";
  const side = dark ? "#191919" : "#F0F0F0";
  const top = dark ? "#161616" : "#F7F7F7";
  const gold = "#C9A227";
  const txt = dark ? "#E8E8E8" : "#4A4A4A";
  const ink = dark ? "#FFFFFF" : "#222222";
  const raw = p.code || p.setName;
  const lab = esc(raw.length > 13 ? raw.slice(0, 12).trim() + "…" : raw);
  const gm = p.game === "ONE_PIECE" ? "ONE PIECE" : "POKÉMON";

  const box = (x: number, y: number, w: number, h: number, d: number, label?: string, sub?: string) => `
    <polygon points="${x},${y} ${x + d},${y - d * 0.6} ${x + w + d},${y - d * 0.6} ${x + w},${y}" fill="${top}" stroke="${st}" stroke-width="1.2" stroke-linejoin="round"/>
    <polygon points="${x + w},${y} ${x + w + d},${y - d * 0.6} ${x + w + d},${y + h - d * 0.6} ${x + w},${y + h}" fill="${side}" stroke="${st}" stroke-width="1.2" stroke-linejoin="round"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${face}" stroke="${st}" stroke-width="1.2"/>
    <rect x="${x}" y="${y}" width="${w}" height="${Math.max(8, h * 0.16)}" fill="${ink}"/>
    <text x="${x + w / 2}" y="${y + Math.max(8, h * 0.16) - 3}" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="500" font-size="${Math.max(6, Math.min(9, h * 0.11))}" letter-spacing="1.4" fill="${dark ? "#000000" : "#FFFFFF"}">${gm}</text>
    ${label ? `<text x="${x + w / 2}" y="${y + h * 0.62}" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="600" font-size="${Math.min(18, ((w - 12) / Math.max(4, label.length)) * 1.75)}" fill="${txt}">${label}</text>` : ""}
    ${sub ? `<text x="${x + w / 2}" y="${y + h * 0.82}" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="400" font-size="7.5" letter-spacing="1.1" fill="${dark ? "#9A9A9A" : "#8C8C8C"}">${sub}</text>` : ""}`;

  let g = "";
  const t = p.type;
  if (t === "Case") g = box(34, 92, 62, 44, 14) + box(100, 92, 62, 44, 14) + box(56, 50, 82, 46, 16, lab, "CASE");
  else if (t === "Bundle") g = box(28, 66, 74, 56, 14, lab, "") + box(104, 76, 66, 46, 14, "", "BUNDLE");
  else if (t === "Slim box") g = box(48, 60, 94, 52, 18, lab, "SLIM BOX");
  else if (t === "Jumbo box") g = box(40, 52, 108, 74, 22, lab, "JUMBO BOX");
  else if (t === "Display" || t === "Coin e badge") {
    g =
      box(40, 56, 108, 70, 22, "", "") +
      `<rect x="52" y="76" width="84" height="40" fill="${dark ? "#000000" : "#F7F7F7"}" stroke="${st}" stroke-width="1"/>` +
      [0, 1, 2, 3]
        .map((i) =>
          t === "Coin e badge"
            ? `<circle cx="${66 + i * 19}" cy="96" r="7.5" fill="none" stroke="${gold}" stroke-width="1.4"/>`
            : `<rect x="${58 + i * 19}" y="82" width="15" height="28" rx="2" fill="${face}" stroke="${st}" stroke-width="1"/>`
        )
        .join("") +
      `<text x="94" y="${56 + 70 - 3}" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="600" font-size="9" fill="${txt}">${lab}</text>`;
  } else if (t === "Tin") {
    g = `<rect x="56" y="44" width="88" height="84" rx="16" fill="${face}" stroke="${st}" stroke-width="1.2"/><path d="M56 66 h88" stroke="${st}" stroke-width="1"/><rect x="56" y="44" width="88" height="22" rx="16" fill="${ink}"/><text x="100" y="59" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="500" font-size="8" letter-spacing="1.4" fill="${dark ? "#000" : "#fff"}">${gm}</text><text x="100" y="100" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="600" font-size="13" fill="${txt}">${lab.slice(0, 10)}</text><text x="100" y="116" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="400" font-size="7.5" letter-spacing="1.1" fill="#8C8C8C">TIN</text>`;
  } else if (t === "Deck" || t === "Promo e pack" || t === "Accessori") {
    const card = (x: number, y: number, rot: number) =>
      `<g transform="rotate(${rot} ${x + 30} ${y + 42})"><rect x="${x}" y="${y}" width="60" height="84" rx="5" fill="${face}" stroke="${st}" stroke-width="1.2"/><rect x="${x + 6}" y="${y + 6}" width="48" height="72" rx="3" fill="none" stroke="${gold}" stroke-width="1"/></g>`;
    g =
      (t === "Deck" ? card(62, 38, -8) + card(70, 36, -2) : "") +
      card(70, 34, 4) +
      `<text x="100" y="82" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="600" font-size="9" fill="${txt}" transform="rotate(4 100 76)">${lab.slice(0, 9)}</text><text x="100" y="140" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="400" font-size="7.5" letter-spacing="1.3" fill="${dark ? "#9A9A9A" : "#8C8C8C"}">${t === "Deck" ? "DECK" : t === "Accessori" ? "ACCESSORIO" : "PROMO"}</text>`;
  } else if (t === "Gift box e collection" || t === "Special box") {
    g =
      box(42, 58, 100, 66, 20, lab, t === "Special box" ? "SPECIAL BOX" : "GIFT BOX") +
      `<path d="M92 58 v66 M42 74 h100" stroke="${gold}" stroke-width="2.4" opacity=".7"/><path d="M92 58 l12 -12 M92 58 l-12 -14" stroke="${gold}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>`;
  } else {
    g = box(40, 54, 108, 72, 22, lab, "BOOSTER BOX");
  }

  return `<svg viewBox="0 0 200 150" role="img" aria-label="Illustrazione: ${esc(t)}" preserveAspectRatio="xMidYMid meet"><rect width="200" height="150" fill="${bg}"/>${g}</svg>`;
}
