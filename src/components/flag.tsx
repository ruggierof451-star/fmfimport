/**
 * Bandierina della lingua di una sezione (Pokémon IT, One Piece JP, ...). Disegnata in SVG
 * perché le emoji bandiera non si vedono su Windows.
 */
type FlagCode = "it" | "jp" | "cn" | "kr";

/** Ricava la lingua dalla chiave della sezione: "pokemon-jp" → "jp". */
export function flagCodeFor(key: string): FlagCode | null {
  const m = key.match(/-(it|jp|cn|kr)$/);
  return m ? (m[1] as FlagCode) : null;
}

export function SectionFlag({ sectionKey, size = 16 }: { sectionKey: string; size?: number }) {
  const code = flagCodeFor(sectionKey);
  return code ? <Flag code={code} size={size} /> : null;
}

export function Flag({ code, size = 16 }: { code: FlagCode; size?: number }) {
  const w = Math.round(size * 1.5);
  return (
    <svg className="flag" width={w} height={size} viewBox="0 0 30 20" aria-hidden="true">
      {code === "it" ? (
        <>
          <rect width="10" height="20" fill="#009246" />
          <rect x="10" width="10" height="20" fill="#fff" />
          <rect x="20" width="10" height="20" fill="#CE2B37" />
        </>
      ) : code === "jp" ? (
        <>
          <rect width="30" height="20" fill="#fff" />
          <circle cx="15" cy="10" r="6" fill="#BC002D" />
        </>
      ) : code === "cn" ? (
        <>
          <rect width="30" height="20" fill="#DE2910" />
          <path d="M5 2.5l1.1 3.4H9.7L6.8 8l1.1 3.4L5 9.3 2.1 11.4 3.2 8 .3 5.9h3.6z" fill="#FFDE00" />
          <circle cx="10.5" cy="2.5" r=".9" fill="#FFDE00" />
          <circle cx="12.3" cy="4.6" r=".9" fill="#FFDE00" />
          <circle cx="12.3" cy="7.4" r=".9" fill="#FFDE00" />
          <circle cx="10.5" cy="9.5" r=".9" fill="#FFDE00" />
        </>
      ) : (
        <>
          <rect width="30" height="20" fill="#fff" />
          <path d="M15 5a5 5 0 0 1 0 10 2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 0 0-5z" fill="#003478" />
          <path d="M15 5a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 1 0 5 5 5 0 0 1 0-10z" fill="#C60C30" />
          <g stroke="#000" strokeWidth="1.1">
            <path d="M4 4.5l3-2M4.6 5.4l3-2M5.2 6.3l3-2M22 13.7l3-2M22.6 14.6l3-2M23.2 15.5l3-2M4 15.5l3 2M4.6 14.6l3 2M5.2 13.7l3 2M22 6.3l3 2M22.6 5.4l3 2M23.2 4.5l3 2" />
          </g>
        </>
      )}
      <rect width="30" height="20" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1" />
    </svg>
  );
}
