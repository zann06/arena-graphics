import { useEffect, useMemo, useState } from 'react';
import type { GraphicKey } from '@arena/shared/types/realtime.js';
import {
  DEFAULT_TEMPLATE_THEME,
  DISPLAY_FONTS,
  TEMPLATE_TYPES,
  type TemplateRecord,
  type TemplateTheme,
} from '@arena/shared/types/templates.js';
import { OVERLAY_ROUTES } from '../overlay/OverlayApp';
import {
  useActivateTemplate,
  useCreateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  useResetTemplate,
  useTemplates,
  useUpdateTemplate,
} from '../hooks/api/useTemplates';

const TYPE_LABELS: Record<GraphicKey, string> = {
  scoreboard: 'Scoreboard',
  playerIntro: 'Player Intro',
  teamIntro: 'Team Intro',
  draft: 'Draft',
  statistics: 'Statistics',
  mvp: 'MVP',
  fullscreen: 'Fullscreen',
  objective: 'Objective Alert',
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-[0.16em] text-gray-400">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-gray-700 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded border border-gray-700 bg-gray-950 px-2 py-1 font-mono text-xs text-gray-200"
        />
      </span>
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-gray-400">
        {label}
        <span className="font-mono text-gray-300">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-blue-500"
      />
    </label>
  );
}

function LivePreview({ template }: { template: TemplateRecord | null }) {
  // The overlay renders the active template from live state. Show it scaled to
  // fit the preview box, over a dark backdrop so transparency is readable.
  const src = template ? `${OVERLAY_ROUTES[template.templateType]}?preview=1` : '';
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-black">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          Live Overlay Preview {template && `· ${TYPE_LABELS[template.templateType]}`}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-emerald-400">Renders the on-air theme</span>
      </div>
      {src ? (
        <iframe
          key={src}
          title="overlay-preview"
          src={src}
          className="aspect-video w-full border-0 bg-[#101826]"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center text-sm text-gray-500">
          Select a template to preview
        </div>
      )}
      <p className="border-t border-gray-800 px-3 py-1.5 text-[10px] text-gray-500">
        The preview mirrors what is on air. Save + “Set active on air” to see theme changes here and in OBS.
      </p>
    </div>
  );
}

export function TemplateStudioPage() {
  const { data: templates = [], isLoading, error } = useTemplates();
  const updateTemplate = useUpdateTemplate();
  const activateTemplate = useActivateTemplate();
  const duplicateTemplate = useDuplicateTemplate();
  const resetTemplate = useResetTemplate();
  const deleteTemplate = useDeleteTemplate();
  const createTemplate = useCreateTemplate();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ name: string; theme: TemplateTheme } | null>(null);
  const [newType, setNewType] = useState<GraphicKey>('scoreboard');

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId]
  );

  // When the selection changes (or data reloads), refresh the editable draft.
  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft({ name: selected.name, theme: { ...DEFAULT_TEMPLATE_THEME, ...selected.theme } });
  }, [selected]);

  // Pick the first active template once data arrives.
  useEffect(() => {
    if (selectedId === null && templates.length > 0) {
      const first = templates.find((t) => t.isActive) ?? templates[0];
      if (first) setSelectedId(first.id);
    }
  }, [templates, selectedId]);

  const dirty =
    draft && selected && (draft.name !== selected.name || JSON.stringify(draft.theme) !== JSON.stringify({ ...DEFAULT_TEMPLATE_THEME, ...selected.theme }));

  const patchTheme = (patch: Partial<TemplateTheme>) =>
    setDraft((d) => (d ? { ...d, theme: { ...d.theme, ...patch } } : d));

  const save = () => {
    if (!selected || !draft) return;
    updateTemplate.mutate({ id: selected.id, name: draft.name, theme: draft.theme });
  };

  const grouped = TYPE_LABELS;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Template Studio</h2>
        <p className="mt-1 text-sm text-gray-400">
          Edit colors, typography and layout per graphic. The active template is applied to the overlay on air — the
          preview shows the live overlay rendered with the current theme.
        </p>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading templates…</p>}
      {error && <p className="text-sm text-red-400">Failed to load templates: {(error as Error).message}</p>}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {/* List */}
        <aside className="space-y-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Templates</h3>
            </div>
            <ul className="max-h-[520px] divide-y divide-gray-800 overflow-y-auto">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors ${
                      t.id === selectedId ? 'bg-blue-600/15' : 'hover:bg-gray-800'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-gray-200">{t.name}</span>
                      <span className="block text-[10px] uppercase tracking-[0.18em] text-gray-500">
                        {grouped[t.templateType]}
                      </span>
                    </span>
                    {t.isActive && (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                        Active
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {templates.length === 0 && !isLoading && (
                <li className="px-4 py-6 text-center text-xs text-gray-500">No templates yet.</li>
              )}
            </ul>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 p-3">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as GraphicKey)}
              className="flex-1 rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-gray-200"
            >
              {TEMPLATE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t as GraphicKey]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={createTemplate.isPending}
              onClick={() =>
                createTemplate.mutate(
                  { name: `${TYPE_LABELS[newType]} variant`, templateType: newType, theme: DEFAULT_TEMPLATE_THEME },
                  { onSuccess: (t) => setSelectedId(t.id) }
                )
              }
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-blue-500 disabled:opacity-50"
            >
              New
            </button>
          </div>
        </aside>

        {/* Editor */}
        <div className="space-y-4">
          <LivePreview template={selected} />

          {!selected && <p className="text-sm text-gray-500">Select or create a template to edit it.</p>}

          {selected && draft && (
            <div className="grid gap-6 rounded-xl border border-gray-800 bg-gray-900 p-5 lg:grid-cols-2">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] text-gray-400">Name</span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100"
                  />
                </label>

                <div className="space-y-2">
                  <ColorField label="Accent" value={draft.theme.accentColor} onChange={(v) => patchTheme({ accentColor: v })} />
                  <ColorField label="Panel" value={draft.theme.panelColor} onChange={(v) => patchTheme({ panelColor: v })} />
                  <ColorField label="Text" value={draft.theme.textColor} onChange={(v) => patchTheme({ textColor: v })} />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] text-gray-400">Display Font</span>
                  <select
                    value={draft.theme.displayFont}
                    onChange={(e) => patchTheme({ displayFont: e.target.value as TemplateTheme['displayFont'] })}
                    className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100"
                  >
                    {DISPLAY_FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>

                <RangeField
                  label="Scale"
                  value={draft.theme.scale}
                  min={0.8}
                  max={1.2}
                  step={0.05}
                  onChange={(v) => patchTheme({ scale: v })}
                  suffix="×"
                />
                <RangeField
                  label="Corner Radius"
                  value={draft.theme.radius}
                  min={0}
                  max={64}
                  step={1}
                  onChange={(v) => patchTheme({ radius: v })}
                  suffix="px"
                />

                <label className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-gray-400">
                  <input
                    type="checkbox"
                    checked={draft.theme.showAccentBar}
                    onChange={(e) => patchTheme({ showAccentBar: e.target.checked })}
                    className="h-4 w-4 accent-blue-500"
                  />
                  Show accent bar
                </label>
              </div>

              <div className="lg:col-span-2 flex flex-wrap items-center gap-2 border-t border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || updateTemplate.isPending}
                  className="rounded bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:bg-emerald-500 disabled:opacity-40"
                >
                  {updateTemplate.isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </button>
                <button
                  type="button"
                  onClick={() => activateTemplate.mutate(selected.id)}
                  disabled={selected.isActive || activateTemplate.isPending}
                  className="rounded bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white hover:bg-blue-500 disabled:opacity-40"
                >
                  {selected.isActive ? 'Active on air' : 'Set active on air'}
                </button>
                <button
                  type="button"
                  onClick={() => duplicateTemplate.mutate(selected.id)}
                  className="rounded border border-gray-700 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-300 hover:bg-gray-800"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => resetTemplate.mutate(selected.id)}
                  className="rounded border border-gray-700 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-300 hover:bg-gray-800"
                >
                  Reset theme
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete template "${selected.name}"?`)) {
                      deleteTemplate.mutate(selected.id, { onSuccess: () => setSelectedId(null) });
                    }
                  }}
                  disabled={selected.isActive || deleteTemplate.isPending}
                  title={selected.isActive ? 'Deactivate first, or delete a different template' : undefined}
                  className="ml-auto rounded border border-red-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-400 hover:bg-red-950/40 disabled:opacity-30"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
