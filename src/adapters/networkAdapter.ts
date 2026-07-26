// A thin interface over WebSockets, built now (even though multiplayer is
// out of scope for the MVP) so it costs nothing later. Stub only -- no
// concrete WebSocket-backed implementation is required for the MVP.
export interface NetworkAdapter {
  connect(url: string): void;
  send(data: unknown): void;
  disconnect(): void;
}

export function createStubNetworkAdapter(): NetworkAdapter {
  return {
    connect() {
      // no-op -- multiplayer is out of scope for the MVP.
    },
    send() {
      // no-op -- multiplayer is out of scope for the MVP.
    },
    disconnect() {
      // no-op -- multiplayer is out of scope for the MVP.
    },
  };
}
