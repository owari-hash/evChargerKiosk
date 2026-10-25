'use client';

import { useEffect, useState } from 'react';
import { ChargeVisual } from './charge-visual';

interface Slide {
  title: string;
  body: string;
  art: React.ReactNode;
}

function PinArt() {
  return (
    <svg viewBox="0 0 220 220" className="size-64" aria-hidden>
      <circle cx="110" cy="110" r="92" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="14" />
      <g transform="translate(110 110)">
        <circle r="60" fill="rgb(79 216 150 / 0.12)" />
        <path
          d="M0 -34c15.5 0 28 12.5 28 28 0 20-28 46-28 46S-28 14-28-6c0-15.5 12.5-28 28-28Z"
          fill="url(#auth-pin-gradient)"
        />
        <circle r="9" cy="-6" fill="#0d2619" />
      </g>
      <defs>
        <linearGradient id="auth-pin-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6fe3ab" />
          <stop offset="100%" stopColor="#1f8a56" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Two overlapping payment cards — a bank card and a QR/wallet tile — for a
 *  slide about having several ways to pay, rather than one specific method. */
function PaymentArt() {
  return (
    <svg viewBox="0 0 220 220" className="size-64" aria-hidden>
      <circle cx="110" cy="110" r="92" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="14" />
      {/* Offset so the two cards together (not the back card) sit on the
          ring's centre at 110,110. */}
      <g transform="translate(102 126)">
        <rect x="-62" y="-20" width="108" height="70" rx="14" fill="rgb(79 216 150 / 0.14)" stroke="rgb(255 255 255 / 0.12)" />
        <rect x="-50" y="2" width="84" height="8" rx="4" fill="#4fd896" fillOpacity="0.45" />
        <rect x="-50" y="18" width="52" height="8" rx="4" fill="#4fd896" fillOpacity="0.3" />
        <g transform="translate(16 -56)">
          <rect x="-46" y="-26" width="108" height="70" rx="14" fill="url(#auth-card-gradient)" />
          <rect x="-34" y="-8" width="28" height="20" rx="4" fill="#0d2619" fillOpacity="0.55" />
          <circle cx="34" cy="2" r="14" fill="#0d2619" fillOpacity="0.25" />
          <circle cx="24" cy="2" r="14" fill="#0d2619" fillOpacity="0.25" />
        </g>
      </g>
      <defs>
        <linearGradient id="auth-card-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6fe3ab" />
          <stop offset="100%" stopColor="#1f8a56" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function AuthVisual({
  charging,
  slide1Title,
  slide1Body,
  slide2Title,
  slide2Body,
  slide3Title,
  slide3Body,
}: {
  charging: string;
  slide1Title: string;
  slide1Body: string;
  slide2Title: string;
  slide2Body: string;
  slide3Title: string;
  slide3Body: string;
}) {
  const slides: Slide[] = [
    // Shown in this order: find a charger, pay, then control.
    { title: slide2Title, body: slide2Body, art: <PinArt /> },
    { title: slide3Title, body: slide3Body, art: <PaymentArt /> },
    { title: slide1Title, body: slide1Body, art: <ChargeVisual label={charging} /> },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    // Picture and text sit together in the middle of the panel; spreading them
    // to the top and bottom left a large empty gap between them.
    <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-8">
      <div className="relative grid place-items-center" style={{ minHeight: '16rem' }}>
        {slides.map((slide, i) => (
          <div
            key={i}
            aria-hidden={i !== index}
            className="col-start-1 row-start-1 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: i === index ? 1 : 0,
              transform: i === index ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
              pointerEvents: i === index ? 'auto' : 'none',
            }}
          >
            {slide.art}
          </div>
        ))}
      </div>

      <div className="relative space-y-3">
        <div className="relative min-h-[6.5rem] sm:min-h-[5.5rem]">
          {slides.map((slide, i) => (
            <div
              key={i}
              aria-hidden={i !== index}
              className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? 'translateY(0)' : 'translateY(8px)',
              }}
            >
              <h2 className="text-3xl font-bold leading-tight tracking-tight">{slide.title}</h2>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-[#ecfdf5]/75">{slide.body}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 pt-1" role="tablist" aria-label="Slides">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? '1.5rem' : '0.375rem',
                backgroundColor: i === index ? '#4fd896' : 'rgb(255 255 255 / 0.25)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
