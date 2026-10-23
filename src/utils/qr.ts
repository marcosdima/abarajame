export interface JoinPayload {
  roomCode: string;
  serverUrl?: string;
  mode?: 'websocket' | 'simulated';
}

/**
 * Encodes table connection information into a deep link QR string.
 * Format: abarajame://join?code=XK89&server=wss%3A%2F%2F...&mode=websocket
 */
export function encodeJoinQr(payload: JoinPayload): string {
  const code = payload.roomCode.trim().toUpperCase();
  const params: string[] = [`code=${encodeURIComponent(code)}`];

  if (payload.serverUrl) {
    params.push(`server=${encodeURIComponent(payload.serverUrl.trim())}`);
  }
  if (payload.mode) {
    params.push(`mode=${encodeURIComponent(payload.mode)}`);
  }

  return `abarajame://join?${params.join('&')}`;
}

/**
 * Parses raw barcode/QR string or manual code into a structured JoinPayload.
 * Accepts:
 * - Full URI: "abarajame://join?code=XK89&server=...&mode=..."
 * - Query URL: "https://.../join?code=XK89"
 * - Plain room code: "XK89"
 */
export function parseJoinQr(rawData: string): JoinPayload | null {
  if (!rawData || typeof rawData !== 'string') return null;
  const trimmed = rawData.trim();
  if (!trimmed) return null;

  // URI with query parameters
  if (trimmed.includes('?code=') || trimmed.includes('&code=') || trimmed.startsWith('abarajame://')) {
    try {
      const qIndex = trimmed.indexOf('?');
      const queryString = qIndex !== -1 ? trimmed.slice(qIndex + 1) : trimmed;
      const pairs = queryString.split('&');
      let code: string | undefined;
      let serverUrl: string | undefined;
      let mode: 'websocket' | 'simulated' | undefined;

      for (const pair of pairs) {
        const eqIndex = pair.indexOf('=');
        if (eqIndex === -1) continue;
        const k = pair.slice(0, eqIndex);
        const v = pair.slice(eqIndex + 1);
        if (!k || !v) continue;
        const key = decodeURIComponent(k).trim().toLowerCase();
        const val = decodeURIComponent(v).trim();
        if (key === 'code') {
          code = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
        } else if (key === 'server') {
          serverUrl = val;
        } else if (key === 'mode') {
          if (val === 'simulated' || val === 'websocket') {
            mode = val;
          }
        }
      }

      if (code && code.length >= 3) {
        return {
          roomCode: code,
          serverUrl,
          mode,
        };
      }
    } catch {
      // Fall through to plain code parsing
    }
  }

  // Plain alphanumeric room code (e.g. 3-8 characters, strict alphanumeric)
  if (/^[a-zA-Z0-9]{3,8}$/.test(trimmed)) {
    return {
      roomCode: trimmed.toUpperCase(),
    };
  }

  return null;
}
