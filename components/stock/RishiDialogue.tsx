'use client';

import { DialogueSet } from '../../lib/wisdom/dialogue';

interface Props {
  dialogues: DialogueSet[];
}

export function RishiDialogue({ dialogues }: Props) {
  if (!dialogues || dialogues.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-4">💬</div>
        <p className="text-muted">No philosophical debates detected for this stock</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dialogues.map(set => (
        <div key={set.id} className="card-sacred p-6">
          <div className="philosophy-heading text-lg mb-2">{set.title}</div>
          <p className="text-xs text-muted mb-4">{set.context}</p>
          
          <div className="space-y-4">
            {set.exchanges.map((ex, i) => (
              <div key={i} className="border-l-2 border-accent-gold pl-4">
                <div className="text-xs text-accent-gold mb-1 font-bold">{ex.speaker}</div>
                <p className="text-sm text-secondary leading-relaxed italic">{ex.text}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}