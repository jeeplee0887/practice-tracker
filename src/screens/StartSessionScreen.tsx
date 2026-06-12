import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../hooks/useStorage';
import { yamnet } from '../audio/YAMNetClassifier';

export default function StartSessionScreen() {
  const { childId } = useParams();
  const { children } = useAppData();
  const navigate = useNavigate();

  const [selectedChildId, setSelectedChildId] = useState(
    childId ?? children[0]?.id ?? ''
  );
  const selectedChild = children.find((c) => c.id === selectedChildId);
  const [instrument, setInstrument] = useState(
    selectedChild?.instruments[0] ?? 'Piano'
  );

  const [modelReady, setModelReady] = useState(yamnet.isReady);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!yamnet.isReady) {
      yamnet
        .load()
        .then(() => !cancelled && setModelReady(true))
        .catch((err) => {
          if (!cancelled)
            setModelError(
              err instanceof Error ? err.message : 'Failed to load model'
            );
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedChild && !selectedChild.instruments.includes(instrument)) {
      setInstrument(selectedChild.instruments[0] ?? 'Piano');
    }
  }, [selectedChildId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    navigate('/session/active', {
      state: { childId: selectedChildId, instrument },
    });
  }

  if (children.length === 0) {
    return (
      <div className="px-4 pt-6">
        <p className="text-slate-500">Add a child in Settings first.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <button
        onClick={() => navigate('/')}
        className="mb-4 text-sm text-indigo-600"
      >
        ← Back
      </button>
      <h1 className="mb-6 text-2xl font-bold">Start Practice</h1>

      <label className="block text-sm font-medium">Who's practicing?</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedChildId(c.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              c.id === selectedChildId
                ? 'border-transparent text-white'
                : 'border-slate-300 text-slate-700'
            }`}
            style={
              c.id === selectedChildId ? { backgroundColor: c.color } : undefined
            }
          >
            {c.name}
          </button>
        ))}
      </div>

      <label className="mt-6 block text-sm font-medium">Instrument</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {(selectedChild?.instruments.length
          ? selectedChild.instruments
          : ['Piano']
        ).map((inst) => (
          <button
            key={inst}
            onClick={() => setInstrument(inst)}
            className={`rounded-full border px-4 py-2 text-sm ${
              inst === instrument
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 text-slate-600'
            }`}
          >
            {inst}
          </button>
        ))}
      </div>

      <div className="mt-10">
        {modelError ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Could not load the sound model: {modelError}. Check your connection
            and reload.
          </div>
        ) : !modelReady ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            Loading sound model…
          </div>
        ) : (
          <p className="text-sm text-emerald-600">✓ Sound model ready</p>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={!modelReady || !selectedChildId}
        className="mt-4 w-full rounded-xl bg-indigo-600 py-4 text-lg font-semibold text-white disabled:opacity-40"
      >
        🎤 Start Listening
      </button>
      <p className="mt-3 text-center text-xs text-slate-400">
        Your browser will ask for microphone access. Audio is processed
        on-device and never leaves it.
      </p>
    </div>
  );
}
