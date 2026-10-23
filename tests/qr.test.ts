import { describe, it, expect } from 'vitest';
import { encodeJoinQr, parseJoinQr } from '../src/utils/qr';

describe('QR Join Protocol', () => {
  it('encodes and decodes full URI with room code, server URL and mode', () => {
    const payload = {
      roomCode: 'XK89',
      serverUrl: 'wss://relay.alambre.party/room',
      mode: 'websocket' as const,
    };

    const encoded = encodeJoinQr(payload);
    expect(encoded).toBe(
      'abarajame://join?code=XK89&server=wss%3A%2F%2Frelay.alambre.party%2Froom&mode=websocket',
    );

    const parsed = parseJoinQr(encoded);
    expect(parsed).toEqual({
      roomCode: 'XK89',
      serverUrl: 'wss://relay.alambre.party/room',
      mode: 'websocket',
    });
  });

  it('parses plain 4-letter alphanumeric room codes', () => {
    expect(parseJoinQr('XK89')).toEqual({ roomCode: 'XK89' });
    expect(parseJoinQr('ab12')).toEqual({ roomCode: 'AB12' });
  });

  it('parses deep links with query parameters even if domain is http/https', () => {
    const parsed = parseJoinQr(
      'https://abarajame.app/join?code=PL99&server=ws%3A%2F%2F192.168.1.50%3A8787&mode=websocket',
    );
    expect(parsed).toEqual({
      roomCode: 'PL99',
      serverUrl: 'ws://192.168.1.50:8787',
      mode: 'websocket',
    });
  });

  it('parses server URLs containing query parameters or base64 with = correctly', () => {
    const parsed = parseJoinQr(
      'abarajame://join?code=XK89&server=wss%3A%2F%2Frelay.custom%2Froom%3Ftoken%3Dabc%3D%3D&mode=websocket',
    );
    expect(parsed).toEqual({
      roomCode: 'XK89',
      serverUrl: 'wss://relay.custom/room?token=abc==',
      mode: 'websocket',
    });
  });

  it('returns null for empty or invalid data', () => {
    expect(parseJoinQr('')).toBeNull();
    expect(parseJoinQr('  ')).toBeNull();
    expect(parseJoinQr('12')).toBeNull(); // Less than 3 chars
    expect(parseJoinQr('invalid?!#*')).toBeNull();
  });
});
