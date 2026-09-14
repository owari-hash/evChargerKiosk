/**
 * The brand panel's one moving part: a charge ring that fills to 80% as the
 * page opens, then holds. Decorative, so hidden from assistive technology.
 */
export function ChargeVisual({ label }: { label: string }) {
  const radius = 92;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative mx-auto grid place-items-center" aria-hidden>
      <svg viewBox="0 0 220 220" className="size-64">
        <defs>
          <linearGradient id="charge-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="rgb(255 255 255 / 0.08)"
          strokeWidth="14"
        />
        <circle
          cx="110"
          cy="110"
          r={radius}
          fill="none"
          stroke="url(#charge-ring-gradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.2}
          transform="rotate(-90 110 110)"
          className="charge-ring"
          style={{ ['--ring-length' as string]: `${circumference}` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="charge-readout">
          <svg viewBox="0 0 24 24" className="mx-auto mb-1 size-6 fill-emerald-300">
            <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
          </svg>
          <p className="text-5xl font-bold tracking-tight tabular-nums">
            80<span className="text-2xl text-emerald-200/70">%</span>
          </p>
          <p className="mt-1 text-sm text-emerald-100/70">{label}</p>
        </div>
      </div>
    </div>
  );
}
