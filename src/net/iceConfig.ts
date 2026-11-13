export interface CustomTurnConfig {
  urls: string;
  username: string;
  credential: string;
}

const STORAGE_KEY = 'medn_turn_config';

export function loadCustomTurnConfig(): CustomTurnConfig {
  if (typeof window === 'undefined') {
    return { urls: '', username: '', credential: '' };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { urls: '', username: '', credential: '' };
    const parsed = JSON.parse(raw) as Partial<CustomTurnConfig>;
    return {
      urls: parsed.urls ?? '',
      username: parsed.username ?? '',
      credential: parsed.credential ?? '',
    };
  } catch {
    return { urls: '', username: '', credential: '' };
  }
}

export function saveCustomTurnConfig(cfg: CustomTurnConfig): void {
  if (typeof window === 'undefined') return;
  if (!cfg.urls.trim()) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // 1. Optional build-time TURN (e.g. GitHub Actions Secrets -> VITE_TURN_*)
  const envUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const envUser = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const envCred = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
  if (envUrl && envUrl.trim()) {
    servers.push({
      urls: envUrl.trim(),
      username: envUser?.trim() || undefined,
      credential: envCred?.trim() || undefined,
    });
  }

  // 2. Optional user-configured TURN in localStorage
  const custom = loadCustomTurnConfig();
  if (custom.urls.trim()) {
    servers.push({
      urls: custom.urls.trim(),
      username: custom.username.trim() || undefined,
      credential: custom.credential.trim() || undefined,
    });
  }

  return servers;
}
