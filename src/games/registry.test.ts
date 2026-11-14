import { describe, expect, it } from 'vitest';
import { GAME_COLLECTION } from './registry';

describe('GAME_COLLECTION registry', () => {
  it('registers games with unique IDs and valid metadata', () => {
    expect(GAME_COLLECTION.length).toBeGreaterThanOrEqual(2);
    const ids = new Set<string>();
    for (const game of GAME_COLLECTION) {
      expect(game.id).toBeTruthy();
      expect(ids.has(game.id)).toBe(false);
      ids.add(game.id);
      expect(game.title.de).toBeTruthy();
      expect(game.title.en).toBeTruthy();
      expect(game.minPlayers).toBeGreaterThanOrEqual(2);
      expect(game.maxPlayers).toBeGreaterThanOrEqual(game.minPlayers);
      expect(typeof game.component).toBe('function');
    }
  });
});
