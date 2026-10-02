/**
 * useWebSocket — Real-Time WebSocket Hook.
 *
 * SPORT+ da Owner va Player o'rtasidagi real vaqt bog'lanish.
 * Owner slot yoki narxni o'zgartirsa, bu hook Player ekranini
 * darhol yangilaydi — 0 polling, 0 delay.
 *
 * Ikkita kanal:
 *  1. /ws/live  — Global broadcast (barcha o'zgarishlar)
 *  2. /ws/venue/{venueId} — Venue-room (faqat shu venue)
 */

import { useEffect, useRef, useCallback } from 'react';

const WS_BASE = 'wss://sport-jmu3.onrender.com/api/v1';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECTS = 10;
const PING_INTERVAL_MS = 25000; // 25s — server timeout dan oldin

export type WsEventType =
  | 'SLOT_UPDATED'
  | 'VENUE_UPDATED'
  | 'slot:updated'
  | 'slot:held'
  | 'slot:booked'
  | 'slot:released'
  | 'venue:updated';

export interface WsSlotPayload {
  slot_id: string;
  pitch_id: string;
  venue_id?: string;
  status: string;
  is_available: boolean;
  price: number;
}

export interface WsVenuePayload {
  venue_id: string;
  changes: Record<string, any>;
}

export interface WsMessage {
  type: WsEventType;
  data: WsSlotPayload | WsVenuePayload | any;
  timestamp?: string;
}

interface UseWebSocketOptions {
  /** Venue-specific room. Berilmasa global /ws/live ga ulanadi */
  venueId?: string;
  /** Slot o'zgarganda chaqiriladi */
  onSlotUpdated?: (data: WsSlotPayload) => void;
  /** Venue ma'lumotlari o'zgarganda chaqiriladi */
  onVenueUpdated?: (data: WsVenuePayload) => void;
  /** Ixtiyoriy: barcha eventlar */
  onMessage?: (msg: WsMessage) => void;
  /** WebSocket ulanib-uzilishlarini log qilish */
  debug?: boolean;
}

export function useWebSocket({
  venueId,
  onSlotUpdated,
  onVenueUpdated,
  onMessage,
  debug = false,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const shouldReconnect = useRef(true);

  const log = useCallback(
    (...args: any[]) => {
      if (debug) console.log('[WS]', ...args);
    },
    [debug]
  );

  const connect = useCallback(() => {
    if (!shouldReconnect.current) return;

    const url = venueId
      ? `${WS_BASE}/ws/venue/${venueId}`
      : `${WS_BASE}/ws/live`;

    log(`Ulanmoqda: ${url}`);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        log('✅ Ulandi');
        reconnectCount.current = 0;

        // Keep-alive ping
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          log('📨 Event:', msg.type, msg.data);

          onMessage?.(msg);

          // Slot o'zgarishi
          if (
            msg.type === 'SLOT_UPDATED' ||
            msg.type === 'slot:updated' ||
            msg.type === 'slot:held' ||
            msg.type === 'slot:booked' ||
            msg.type === 'slot:released'
          ) {
            const payload = (msg.data?.data || msg.data) as WsSlotPayload;
            onSlotUpdated?.(payload);
          }

          // Venue o'zgarishi (narx, qulayliklar, jadval)
          if (msg.type === 'VENUE_UPDATED' || msg.type === 'venue:updated') {
            const payload = (msg.data?.data || msg.data) as WsVenuePayload;
            onVenueUpdated?.(payload);
          }
        } catch (err) {
          // pong yoki non-JSON message — ignore
        }
      };

      ws.onerror = (err) => {
        log('❌ Xatolik:', err);
      };

      ws.onclose = () => {
        log('🔌 Uzildi');
        if (pingTimer.current) clearInterval(pingTimer.current);

        if (
          shouldReconnect.current &&
          reconnectCount.current < MAX_RECONNECTS
        ) {
          reconnectCount.current += 1;
          const delay = RECONNECT_DELAY_MS * Math.min(reconnectCount.current, 3);
          log(`${delay}ms dan keyin qayta ulanish (#${reconnectCount.current})...`);
          setTimeout(connect, delay);
        }
      };
    } catch (err) {
      log('WebSocket yaratishda xatolik:', err);
    }
  }, [venueId, onSlotUpdated, onVenueUpdated, onMessage, log]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    /** WebSocket instance (send uchun) */
    ws: wsRef,
    /** Qo'lda xabar yuborish */
    send: (data: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
      }
    },
  };
}
