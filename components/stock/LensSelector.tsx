'use client';

interface Props {
  active: string | null;
  onSelect: (lens: string | null) => void;
}

const AVAILABLE_LENSES = [
  { id: 'buffett', label: 'Buffett Lens', emoji: '🦁' },
  { id: 'graham', label: 'Graham Lens', emoji: '📊' },
  { id: 'damani', label: 'Damani Lens', emoji: '🛒' },
];

export function LensSelector({ active, onSelect }: Props) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-xs text-muted">VIEW THROUGH:</span>
      
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1 rounded text-xs transition ${
          !active 
            ? 'bg-accent-gold text-black font-bold' 
            : 'bg-secondary text-muted hover:text-primary'
        }`}
      >
        All Rishis
      </button>

      {AVAILABLE_LENSES.map(lens => (
        <button
          key={lens.id}
          onClick={() => onSelect(lens.id)}
          className={`px-3 py-1 rounded text-xs transition ${
            active === lens.id
              ? 'bg-accent-gold text-black font-bold'
              : 'bg-secondary text-muted hover:text-primary'
          }`}
        >
          {lens.emoji} {lens.label}
        </button>
      ))}
    </div>
  );
}