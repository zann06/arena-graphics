import { useEffect, useMemo, useState, type ReactNode } from 'react';
export function useLocalPreview() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('preview') === '1';
  }, []);
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const clamp = (next: number) => Math.max(min, Math.min(max, next));
  return (
    <div className="flex items-stretch overflow-hidden rounded border border-gray-700 bg-gray-800">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className="w-8 shrink-0 text-lg leading-none text-gray-300 hover:bg-gray-700"
        aria-label="decrease"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
        className="w-full border-none bg-transparent text-center text-sm focus:shadow-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className="w-8 shrink-0 text-lg leading-none text-gray-300 hover:bg-gray-700"
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}

export { Stepper };

export function EndpointStatus({ url, label }: { url: string | null; label: string }) {
  const [status, setStatus] = useState<{ ok: boolean; label: string } | null>(null);

  useEffect(() => {
    if (!url) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(url);
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus({ ok: false, label: `HTTP ${res.status}` });
        } else if (typeof body.connected === 'boolean') {
          setStatus({ ok: body.connected, label: body.connected ? 'Connected' : (body.state ?? 'Disconnected') });
        } else {
          setStatus({ ok: true, label: 'Reachable' });
        }
      } catch {
        if (!cancelled) setStatus({ ok: false, label: 'Unreachable' });
      }
    };
    check();
    const timer = window.setInterval(check, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [url]);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
        status?.ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-800 text-gray-400'
      }`}
      title={url ?? 'not configured'}
    >
      <span className={`h-2 w-2 rounded-full ${status?.ok ? 'bg-emerald-400' : 'bg-gray-500'}`} />
      {label}: {status?.label ?? 'checking'}
    </span>
  );
}

export function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">{title}</h3>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
