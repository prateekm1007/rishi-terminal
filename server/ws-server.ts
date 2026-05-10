import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Default symbols to broadcast
const DEFAULT_SYMBOLS = [
  'NIFTY50', 'SENSEX', 'BANK_NIFTY',
  'BTC', 'ETH', 'SOL',
  'GOLD', 'SILVER', 'WTI',
  'USD/INR', 'EUR/INR',
];

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Let client subscribe to custom symbols
  socket.on('subscribe', (symbols: string[]) => {
    socket.data.symbols = symbols;
    console.log(`[WS] ${socket.id} subscribed to:`, symbols);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Broadcast prices every 10 seconds via REST batch endpoint
async function broadcastPrices() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/prices/batch`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbols: DEFAULT_SYMBOLS }),
      }
    );
    const data = await res.json();
    io.emit('prices', { type: 'update', data, timestamp: Date.now() });
    console.log(`[WS] Broadcast sent at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error('[WS] Broadcast error:', err);
  }
}

const PORT = parseInt(process.env.WS_PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`[WS] Server running on port ${PORT}`);
  broadcastPrices(); // immediate first broadcast
});

setInterval(broadcastPrices, 10_000);
