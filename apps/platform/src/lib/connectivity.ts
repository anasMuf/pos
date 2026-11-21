export type ConnectionMode = 'online' | 'offline';

// The effective mode is offline if the user chose offline, or if the connection
// is lost. Manual "online" never hides a real disconnection.
export function deriveEffectiveMode(manualMode: ConnectionMode, isConnected: boolean): ConnectionMode {
  if (manualMode === 'offline') {
    return 'offline';
  }
  return isConnected ? 'online' : 'offline';
}
