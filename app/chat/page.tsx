// N1 (round 3): server component. The chat picker runs on the slim
// index (symbol/name/sector + the free consensus number); the full
// display record for the selected symbol comes from
// GET /api/stock/[symbol]. No dataset, no engine in the bundle.
import { getSlimIndex } from '@/lib/scoring/slimIndex';
import { ChatClient } from '@/components/chat/ChatClient';

export default function ChatPage() {
  const rows = getSlimIndex();
  return <ChatClient rows={rows} />;
}
