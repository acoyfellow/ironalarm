/**
 * Simple WebSocket service for real-time task updates
 */

export interface WebSocketMessage {
  type: string;
  data: any;
}

export function createWebSocket(
  url: string,
  onMessage: (message: WebSocketMessage) => void,
  onConnect?: () => void,
  onDisconnect?: () => void
): { close: () => void } {
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage(message);
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        onDisconnect?.();
        // Reconnect after 2 seconds
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        // Error handling - will trigger onclose
      };
    } catch (e) {
      console.error("[WS] Connection failed:", e);
      reconnectTimeout = setTimeout(connect, 2000);
    }
  }

  connect();

  return {
    close: () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    },
  };
}

