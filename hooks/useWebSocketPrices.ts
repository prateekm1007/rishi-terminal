'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { PriceData } from './useLivePrices';

let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
  }
  return _socket;
}

export function useWebSocketPrices(symbols: string[]) {
  const [prices,    setPrices]    = useState<Record<string, PriceData>>({});
  const [connected, setConnected] = useState(false);
  const symbolsRef = useRef(symbols);

  useEffect(() => { symbolsRef.current = symbols; }, [symbols]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe', symbolsRef.current);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('prices', (payload: { type: string; data: Record<string, PriceData> }) => {
      if (payload.type === 'update') {
        setPrices(prev => ({ ...prev, ...payload.data }));
      }
    });

    if (socket.connected) {
      socket.emit('subscribe', symbolsRef.current);
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('prices');
    };
  }, []);

  return { prices, connected };
}
