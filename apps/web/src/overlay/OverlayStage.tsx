import { useEffect, useRef, useState, type ReactNode } from 'react';
import { calculateScale } from '@arena/graphics-core';

export function OverlayStage({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    document.documentElement.classList.add('overlay-mode');
    document.body.classList.add('overlay-mode');
    return () => {
      document.documentElement.classList.remove('overlay-mode');
      document.body.classList.remove('overlay-mode');
    };
  }, []);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;

    const measure = () => {
      setViewport({ width: element.clientWidth, height: element.clientHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    // Safety net: some embedded/overlay hosts (and headless captures) resize the
    // window without firing ResizeObserver on this node; re-measure briefly.
    const settle = window.setInterval(measure, 250);
    const stopSettle = window.setTimeout(() => window.clearInterval(settle), 4000);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      window.clearInterval(settle);
      window.clearTimeout(stopSettle);
    };
  }, []);

  const scale = calculateScale(viewport.width, viewport.height);
  const offsetX = (viewport.width - 1920 * scale) / 2;
  const offsetY = (viewport.height - 1080 * scale) / 2;

  return (
    <div ref={hostRef} className="fixed inset-0 overflow-hidden bg-transparent">
      <div
        style={{
          width: 1920,
          height: 1080,
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}
