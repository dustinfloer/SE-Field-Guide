export function StudioLogo() {
  return (
    <div className="studio-logo" aria-label="Demo Deck Studio">
      <svg className="studio-logo-mark" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="studio-logo-gradient" x1="8" x2="56" y1="8" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1cc7bd" />
            <stop offset="0.62" stopColor="#18a99e" />
            <stop offset="1" stopColor="#f2b84b" />
          </linearGradient>
        </defs>
        <rect x="17" y="8" width="34" height="42" rx="8" fill="#12202a" stroke="#2c3946" strokeWidth="2" />
        <rect x="10" y="14" width="38" height="42" rx="9" fill="#0b1117" stroke="url(#studio-logo-gradient)" strokeWidth="2.5" />
        <path
          d="M23 25h9.5c6.6 0 11.5 4.8 11.5 10.8S39.1 46 32.5 46H23V25Z"
          fill="none"
          stroke="#eef4f5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <path d="M30 32v7h3.1c2.3 0 4-1.4 4-3.5s-1.7-3.5-4-3.5H30Z" fill="#1cc7bd" />
        <circle cx="49" cy="18" r="4.2" fill="#f2b84b" />
        <circle cx="49" cy="18" r="8.5" fill="none" stroke="#f2b84b" strokeOpacity="0.26" strokeWidth="2" />
      </svg>
    </div>
  );
}
