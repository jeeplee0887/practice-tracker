import { useEffect, useRef, useState } from 'react';
import {
  useAppData,
  getAllData,
  replaceAllData,
  isStoragePersisted,
} from '../hooks/useStorage';
import {
  AVAILABLE_INSTRUMENTS,
  CHILD_COLORS,
  PAUSE_DEBOUNCE_MAX,
  PAUSE_DEBOUNCE_MIN,
  type Child,
} from '../types';
import { formatSilenceTolerance } from '../utils';

export default function SettingsScreen() {
  const {
    children,
    settings,
    addChild,
    updateChild,
    deleteChild,
    updateSettings,
  } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);

  function startAdd() {
    addChild({
      name: 'New Child',
      instruments: ['Piano'],
      dailyGoalMinutes: 30,
      color: CHILD_COLORS[children.length % CHILD_COLORS.length],
    });
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-600">Children</h2>
          <button
            onClick={startAdd}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            + Add
          </button>
        </div>
        <div className="space-y-3">
          {children.map((child) => (
            <ChildEditor
              key={child.id}
              child={child}
              editing={editingId === child.id}
              onToggleEdit={() =>
                setEditingId(editingId === child.id ? null : child.id)
              }
              onChange={(patch) => updateChild(child.id, patch)}
              onDelete={() => {
                if (confirm(`Delete ${child.name}? This removes their sessions.`)) {
                  deleteChild(child.id);
                }
              }}
            />
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-600">
          Detection
        </h2>

        <label className="block text-sm font-medium">
          Sensitivity
          <span className="ml-2 font-normal text-slate-400">
            (confidence threshold {settings.detectionThreshold.toFixed(2)})
          </span>
        </label>
        <input
          type="range"
          min={0.1}
          max={0.9}
          step={0.05}
          // Higher sensitivity = lower confidence threshold, so invert the slider.
          value={1 - settings.detectionThreshold}
          onChange={(e) =>
            updateSettings({
              detectionThreshold: Number(
                (1 - Number(e.target.value)).toFixed(2)
              ),
            })
          }
          className="mt-2 w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Less sensitive</span>
          <span>More sensitive</span>
        </div>

        <label className="mt-6 block text-sm font-medium">
          Pause after {formatSilenceTolerance(settings.pauseDebounceSeconds)} of
          silence
        </label>
        <input
          type="range"
          min={PAUSE_DEBOUNCE_MIN}
          max={PAUSE_DEBOUNCE_MAX}
          step={5}
          value={settings.pauseDebounceSeconds}
          onChange={(e) =>
            updateSettings({ pauseDebounceSeconds: Number(e.target.value) })
          }
          className="mt-2 w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>15 sec</span>
          <span>2 min</span>
        </div>

        <label className="mt-6 flex items-center justify-between text-sm font-medium">
          Debug mode (show live YAMNet labels)
          <input
            type="checkbox"
            checked={settings.debugMode}
            onChange={(e) => updateSettings({ debugMode: e.target.checked })}
            className="h-5 w-5 accent-indigo-600"
          />
        </label>
      </section>

      <BackupSection />
    </div>
  );
}

function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void isStoragePersisted().then(setPersisted);
  }, []);

  function exportBackup() {
    const blob = new Blob([JSON.stringify(getAllData(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practice-tracker-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (
        !confirm(
          'Importing replaces all current children and sessions on this device. Continue?'
        )
      )
        return;
      replaceAllData(data);
      alert('Backup imported successfully.');
    } catch (err) {
      alert(
        `Could not import backup: ${
          err instanceof Error ? err.message : 'invalid file'
        }`
      );
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-600">
        Data &amp; backup
      </h2>
      <p className="mb-4 text-xs text-slate-400">
        {persisted === null
          ? 'Checking storage…'
          : persisted
            ? '✓ Storage is persistent — data is protected from automatic cleanup.'
            : 'Storage is best-effort. Add the app to your home screen to protect data, and export a backup regularly.'}
      </p>

      <div className="flex gap-3">
        <button
          onClick={exportBackup}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700"
        >
          Export backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700"
        >
          Import backup
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importBackup(file);
          e.target.value = '';
        }}
      />
    </section>
  );
}

interface ChildEditorProps {
  child: Child;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (patch: Partial<Child>) => void;
  onDelete: () => void;
}

function ChildEditor({
  child,
  editing,
  onToggleEdit,
  onChange,
  onDelete,
}: ChildEditorProps) {
  function toggleInstrument(instrument: string) {
    const has = child.instruments.includes(instrument);
    const next = has
      ? child.instruments.filter((i) => i !== instrument)
      : [...child.instruments, instrument];
    onChange({ instruments: next });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: child.color }}
        />
        <span className="flex-1 font-semibold">{child.name}</span>
        <button
          onClick={onToggleEdit}
          className="text-sm text-indigo-600"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium">
            Name
            <input
              type="text"
              value={child.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <div>
            <span className="text-sm font-medium">Instruments</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVAILABLE_INSTRUMENTS.map((inst) => {
                const active = child.instruments.includes(inst);
                return (
                  <button
                    key={inst}
                    onClick={() => toggleInstrument(inst)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    {inst}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block text-sm font-medium">
            Daily goal: {child.dailyGoalMinutes} min
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={child.dailyGoalMinutes}
              onChange={(e) =>
                onChange({ dailyGoalMinutes: Number(e.target.value) })
              }
              className="mt-2 w-full accent-indigo-600"
            />
          </label>

          <div>
            <span className="text-sm font-medium">Color</span>
            <div className="mt-2 flex gap-2">
              {CHILD_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ color: c })}
                  className={`h-7 w-7 rounded-full ${
                    child.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={onDelete}
            className="text-sm font-medium text-red-600"
          >
            Delete child
          </button>
        </div>
      )}
    </div>
  );
}
