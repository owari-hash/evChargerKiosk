'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Moves one highlight element to whichever item is active, so switching tabs
 * slides the highlight across instead of jumping. The position is written
 * straight to the element's style — no state, no extra render.
 *
 * The items and the indicator must share a positioned parent, because the
 * measurements are `offsetLeft` / `offsetTop` against it.
 */
export function useSlidingIndicator<T extends HTMLElement>(activeKey: string | null) {
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef(new Map<string, T>());

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;

    const place = () => {
      const item = activeKey ? itemRefs.current.get(activeKey) : undefined;
      if (!item || item.offsetWidth === 0) {
        indicator.style.opacity = '0';
        return;
      }
      indicator.style.opacity = '1';
      indicator.style.width = `${item.offsetWidth}px`;
      indicator.style.height = `${item.offsetHeight}px`;
      indicator.style.transform = `translate(${item.offsetLeft}px, ${item.offsetTop}px)`;
    };

    place();
    // Transitions switch on only after the first placement, so the highlight
    // does not sweep in from the corner when the page loads.
    const frame = requestAnimationFrame(() => {
      indicator.dataset.ready = 'true';
    });
    const observer = new ResizeObserver(place);
    itemRefs.current.forEach((element) => observer.observe(element));
    window.addEventListener('resize', place);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [activeKey]);

  const itemRef = (key: string) => (element: T | null) => {
    if (element) itemRefs.current.set(key, element);
    else itemRefs.current.delete(key);
  };

  return { indicatorRef, itemRef };
}
