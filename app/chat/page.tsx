// N1 (round 3): server component. The chat picker runs on the slim
// index (symbol/name/sector + the free consensus number); the full
// display record for the selected symbol comes from
// GET /api/stock/[symbol]. No dataset, no engine in the bundle.
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { toScreenerRows } from '@/lib/transport/slimWire';
import { ChatClient } from '@/components/chat/ChatClient';
import { NamespaceProvider } from '@/components/shared/NamespaceProvider';
import { chat } from '@/messages/en.json';

// X4 (Round 11): the chat namespace arrives from the server as an RSC prop
// (flight payload) instead of riding the client bundle — see the homepage's
// note in app/page.tsx.

export default function ChatPage() {
  // R16 C5: the picker reads symbol/name/sector/consensus only — the
  // projection drops verdict summaries from this page's flight payload.
  const rows = toScreenerRows(getSlimIndex());
  return (
    <NamespaceProvider ns={{ chat }}>
      <ChatClient rows={rows} />
    </NamespaceProvider>
  );
}
