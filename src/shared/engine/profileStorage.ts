const PROFILE_STORAGE_KEY = 'boardgame_profile';
const LEGACY_PROFILE_KEYS = ['medn_profile', 'monopoly_profile'];
const LEGACY_USERNAME_KEY = 'medn_username';

export interface SavedProfile {
  name?: string;
  major?: string;
  emoji?: string;
}

export function loadSavedProfile(): SavedProfile {
  if (typeof window === 'undefined') return {};
  try {
    let raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_PROFILE_KEYS) {
        const candidate = window.localStorage.getItem(legacyKey);
        if (candidate) {
          raw = candidate;
          break;
        }
      }
    }
    const parsed = raw ? (JSON.parse(raw) as SavedProfile) : {};
    const legacyName = window.localStorage.getItem(LEGACY_USERNAME_KEY)?.trim().slice(0, 18);
    return {
      name: parsed.name?.trim().slice(0, 18) || legacyName || undefined,
      major: typeof parsed.major === 'string' ? parsed.major.trim().slice(0, 28) : undefined,
      emoji: typeof parsed.emoji === 'string' ? parsed.emoji.trim().slice(0, 8) : undefined,
    };
  } catch {
    return {};
  }
}

export function saveProfile(partial: SavedProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadSavedProfile();
    const next: SavedProfile = {
      ...current,
      ...(partial.name !== undefined && partial.name.trim()
        ? { name: partial.name.trim().slice(0, 18) }
        : {}),
      ...(partial.major !== undefined ? { major: partial.major.trim().slice(0, 28) } : {}),
      ...(partial.emoji !== undefined ? { emoji: partial.emoji.trim().slice(0, 8) } : {}),
    };
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    if (next.name) {
      window.localStorage.setItem(LEGACY_USERNAME_KEY, next.name);
    }
  } catch {
    // ignore storage errors
  }
}
