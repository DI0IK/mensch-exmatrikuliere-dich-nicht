export type GameId = string;

export function buildJoinUrl(roomCode: string, gameId: GameId = 'medn'): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams({ game: gameId, room: roomCode });
  return `${window.location.origin}${window.location.pathname}#${params.toString()}`;
}

export function extractRoomCodeFromHash(): string {
  if (typeof window === 'undefined') return '';
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return '';
  const params = new URLSearchParams(raw);
  return params.get('room') ?? '';
}

export function extractGameFromHash(): GameId | null {
  if (typeof window === 'undefined') return null;
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const game = params.get('game');
  if (game) return game;
  if (params.get('room')) return 'medn';
  return null;
}
