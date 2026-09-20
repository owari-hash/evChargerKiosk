'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface HeroScrollCueProps {
  targetId?: string;
  label: string;
}

export function HeroScrollCue({ targetId = 'features', label }: HeroScrollCueProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      // Fade out as soon as the user scrolls away from the top of the hero
      setVisible(window.scrollY < 30);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
      )}
      aria-hidden={!visible}
    >
      <a
        href={`#${targetId}`}
        onClick={handleClick}
        tabIndex={visible ? 0 : -1}
        aria-label={label}
        title={label}
        className="pointer-events-auto grid size-12 animate-bounce place-items-center rounded-full bg-brand text-brand-contrast shadow-[0_10px_25px_-5px_color-mix(in_srgb,var(--brand)_50%,transparent)] ring-1 ring-brand-strong/40 transition hover:bg-brand-strong hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </a>
    </div>
  );
}
