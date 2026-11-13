export type GameId = 'medn' | 'monopoly';

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

export function extractGameFromHash(): GameId {
  if (typeof window === 'undefined') return 'medn';
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return 'medn';
  const params = new URLSearchParams(raw);
  return params.get('game') === 'monopoly' ? 'monopoly' : 'medn';
}
