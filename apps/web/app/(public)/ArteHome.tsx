export function ArteHome() {
  return (
    <svg className="h-auto w-full drop-shadow-xl" viewBox="0 0 560 520" aria-hidden="true">
      <defs>
        <linearGradient id="q1" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--brand-violet)" />
          <stop offset=".5" stopColor="var(--violet-tint)" />
          <stop offset="1" stopColor="var(--brand-violet)" />
        </linearGradient>
        <linearGradient id="q2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--violet-tint)" />
          <stop offset=".3" stopColor="var(--brand-violet)" />
          <stop offset="1" stopColor="var(--primary-hover)" />
        </linearGradient>
        <linearGradient id="q3" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--primary-hover)" />
          <stop offset=".6" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--brand-violet)" />
        </linearGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <ellipse
        cx="270"
        cy="300"
        rx="290"
        ry="115"
        transform="rotate(-22 270 300)"
        fill="none"
        stroke="var(--brand-violet)"
        strokeWidth="1"
        opacity=".7"
      />
      <ellipse
        cx="300"
        cy="400"
        rx="250"
        ry="62"
        transform="rotate(-8 300 400)"
        fill="none"
        stroke="var(--brand-violet)"
        strokeWidth="1"
        opacity=".55"
      />
      <polygon
        points="70,400 185,410 330,95 215,70 450,410 330,430"
        fill="var(--primary)"
        opacity=".35"
        filter="url(#soft)"
        transform="translate(0 26)"
      />
      <g stroke="var(--surface)" strokeOpacity=".5" strokeWidth="1.5" strokeLinejoin="round">
        <polygon points="330,430 450,410 550,110 450,130" fill="url(#q3)" />
        <polygon points="215,70 330,95 450,410 330,430" fill="url(#q2)" />
        <polygon points="70,400 185,410 330,95 215,70" fill="url(#q1)" />
      </g>
      <g stroke="none">
        <polygon points="95,390 168,398 288,112 232,98" fill="var(--surface)" opacity=".22" />
        <polygon points="240,110 316,126 420,388 346,404" fill="var(--surface)" opacity=".14" />
        <polygon points="352,404 436,390 520,134 462,148" fill="var(--surface)" opacity=".12" />
      </g>
      <path
        d="M82 392 L214 76"
        fill="none"
        stroke="var(--surface)"
        strokeOpacity=".7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M236 92 L338 408"
        fill="none"
        stroke="var(--surface)"
        strokeOpacity=".35"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <g transform="translate(470 96) rotate(6)">
        <rect width="44" height="196" fill="var(--primary)" />
        <text
          transform="translate(30 98) rotate(-90)"
          textAnchor="middle"
          fill="var(--surface)"
          className="font-display"
          fontWeight="800"
          fontSize="23"
          letterSpacing="1.5"
        >
          NOTA A
        </text>
      </g>
      <rect
        x="226"
        y="24"
        width="26"
        height="26"
        fill="var(--success-tint)"
        transform="rotate(32 239 37)"
      />
      <rect
        x="318"
        y="426"
        width="15"
        height="15"
        fill="var(--primary)"
        transform="rotate(30 325 433)"
        opacity=".9"
      />
      <rect
        x="262"
        y="276"
        width="7"
        height="7"
        fill="var(--primary)"
        transform="rotate(30 265 279)"
      />
    </svg>
  );
}
