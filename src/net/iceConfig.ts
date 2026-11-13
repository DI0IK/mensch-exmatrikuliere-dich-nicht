export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Optional build-time TURN (e.g. GitHub Actions Secrets -> VITE_TURN_*)
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

  return servers;
}
