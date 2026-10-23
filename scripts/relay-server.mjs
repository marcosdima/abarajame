#!/usr/bin/env node
import http from 'node:http';
import os from 'node:os';
import { exec } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT) || 8787;

// Ephemeral room storage: roomCode -> Map<clientId, { id, name, isHost, ws }>
const rooms = new Map();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    server: 'Edge Room Relay Server',
    activeRooms: rooms.size,
    timestamp: Date.now(),
  }));
});

const wss = new WebSocketServer({ server });

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

wss.on('connection', (ws, req) => {
  let clientRoom = null;
  let clientId = null;
  let clientName = null;
  let clientIsHost = false;

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const roomCandidate = pathParts[pathParts.length - 1];
    if (roomCandidate && roomCandidate !== 'room') {
      clientRoom = roomCandidate.toUpperCase();
    }
    const qId = url.searchParams.get('id');
    const qName = url.searchParams.get('name');
    if (qId) clientId = qId;
    if (qName) clientName = decodeURIComponent(qName);
  } catch {
    // URL parsing fallback
  }

  const broadcastToRoom = (roomCode, data, excludeWs = null) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const payload = JSON.stringify(data);
    for (const client of room.values()) {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  };

  const handleJoin = (joinData) => {
    const roomCode = String(joinData.roomCode || clientRoom || 'DEFAULT').toUpperCase();
    clientId = String(joinData.id || joinData.playerId || clientId || `p_${Math.random().toString(36).substring(2, 8)}`);
    clientName = String(joinData.name || joinData.playerName || clientName || 'Anonymous');
    clientIsHost = Boolean(joinData.isHost);
    clientRoom = roomCode;

    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, new Map());
    }
    const room = rooms.get(roomCode);

    // Register client
    room.set(clientId, {
      id: clientId,
      name: clientName,
      isHost: clientIsHost,
      ws,
    });

    console.log(`[Relay] 🟢 "${clientName}" (${clientId}) joined room [${roomCode}] (Total: ${room.size})`);

    // 1. Reply to this client with current room members (peers)
    const peers = Array.from(room.values())
      .filter((c) => c.id !== clientId)
      .map((c) => ({ id: c.id, name: c.name, isHost: c.isHost }));

    ws.send(JSON.stringify({
      type: 'room_joined',
      roomCode,
      peers,
    }));

    // 2. Broadcast to other room members that a new peer joined
    broadcastToRoom(roomCode, {
      type: 'peer_joined',
      peer: {
        id: clientId,
        name: clientName,
        isHost: clientIsHost,
      },
    }, ws);
  };

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      // 1. Join packet
      if (msg.type === 'join' || msg.type === 'ROOM_JOIN') {
        handleJoin(msg);
        return;
      }

      // 2. Heartbeat ping
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          sentAt: msg.sentAt || Date.now(),
        }));
        return;
      }

      // 3. Application messages
      if (clientRoom && rooms.has(clientRoom)) {
        broadcastToRoom(clientRoom, msg, ws);
      }
    } catch (err) {
      console.error('[Relay] Error handling message:', err);
    }
  });

  ws.on('close', (code, reason) => {
    const time = new Date().toLocaleTimeString();
    if (clientRoom && rooms.has(clientRoom)) {
      const room = rooms.get(clientRoom);
      if (clientId) {
        room.delete(clientId);
        console.log(`[${time}] [Relay] 🔴 "${clientName}" (${clientId}) left room [${clientRoom}] (Code: ${code}, Reason: "${reason ? reason.toString() : ''}") (Remaining: ${room.size})`);

        broadcastToRoom(clientRoom, {
          type: 'peer_left',
          peerId: clientId,
        });
      }
      if (room.size === 0) {
        rooms.delete(clientRoom);
        console.log(`[${time}] [Relay] 🗑️ Cleaned up empty room [${clientRoom}]`);
      }
    }
  });

  ws.on('error', (err) => {
    const time = new Date().toLocaleTimeString();
    console.error(`[${time}] [Relay] ⚠️ Socket error on client ${clientId || 'unknown'}:`, err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  console.log('====================================================');
  console.log(`🚀 Edge Room Relay Server listening on 0.0.0.0:${PORT}`);
  console.log('----------------------------------------------------');
  console.log(`💻 Web / iOS Simulator:   ws://localhost:${PORT}`);
  console.log(`🤖 Android Emulator:      ws://10.0.2.2:${PORT}`);
  if (localIps.length > 0) {
    for (const ip of localIps) {
      console.log(`📱 Physical Device (LAN): ws://${ip}:${PORT}`);
    }
  }
  console.log('====================================================');

  exec(`adb reverse tcp:${PORT} tcp:${PORT}`, (err) => {
    if (!err) {
      console.log(`⚡ Auto-routed Android Emulator: "adb reverse tcp:${PORT} tcp:${PORT}" enabled!`);
      console.log(`   (Android Emulator can now also use ws://localhost:${PORT})`);
    }
  });
});
