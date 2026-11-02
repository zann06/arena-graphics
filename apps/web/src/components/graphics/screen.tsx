import { useLocation } from 'react-router-dom';

/**
 * Graphics Control lives at /dashboard/control; the OBS-friendly monitor page
 * lives at /monitor (dedicated 1080p operator feed).
 */
export function useGraphicsScreen(): 'control' | 'monitor' {
  const { pathname } = useLocation();
  return pathname.startsWith('/monitor') ? 'monitor' : 'control';
}

export function ScreenTabs() {
  const screen = useGraphicsScreen();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-950 p-1 text-xs font-semibold uppercase tracking-widest">
      <a
        href="/dashboard/control"
        className={`rounded px-3 py-1.5 ${screen === 'control' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Control
      </a>
      <a
        href="/monitor"
        target="_blank"
        rel="noreferrer"
        className={`rounded px-3 py-1.5 ${screen === 'monitor' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Monitor ↗
      </a>
    </div>
  );
}
