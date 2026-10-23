import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AlambreIcons, useNavigator, useToast } from 'alambre';
import { sanitizeRoomCode, useRoomRelay } from '@some-alambre/room-relay';
import {
  AppBadge,
  AppButton,
  AppCard,
  AppText,
  AppTextInput,
  AppTitle,
} from '@some-alambre/ui';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import { useConfig, saveField, DEFAULT_LAN_RELAY } from '../../providers/config';
import { getSessionRelayClient, useTableSession } from '../../providers/table-session';
import { encodeJoinQr } from '../../utils/qr';

import type { PlayerSeat } from '../../engine';

type LobbyRelayEvents = {
  LOBBY_SYNC: { seats: PlayerSeat[]; matchSeed: string };
  LOBBY_START_MATCH: { seats: PlayerSeat[]; matchSeed: string };
  [key: string]: unknown;
};

export default function Lobby() {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { navigate } = useNavigator();
  const { show } = useToast();
  const { config } = useConfig();
  const {
    session,
    rollRoomCode,
    setServerUrl,
    addBotSeat,
    removeSeat,
    syncPeerSeats,
    syncLobbySnapshot,
    startNewMatchSeed,
  } = useTableSession();

  const [showQr, setShowQr] = useState(true);

  const sessionClient = getSessionRelayClient<LobbyRelayEvents>();
  const relay = useRoomRelay<LobbyRelayEvents>({ client: sessionClient });

  const relayClient = relay.client;

  // Host: reconcile human peer list when relay.peers changes
  useEffect(() => {
    if (session.isHost) {
      syncPeerSeats(relay.peers);
    }
  }, [relay.peers, session.isHost, syncPeerSeats]);

  // Host: broadcast authoritative seat list and matchSeed using stable relayClient
  useEffect(() => {
    if (session.isHost && relay.status === 'connected') {
      relayClient.send('LOBBY_SYNC', {
        seats: session.seats,
        matchSeed: session.matchSeed,
      });
    }
  }, [
    relayClient,
    relay.peers.length,
    relay.status,
    session.isHost,
    session.matchSeed,
    session.seats,
  ]);

  // Guest: listen for host lobby sync and match start transitions using stable relayClient
  useEffect(() => {
    if (session.isHost) return;

    const unsubSync = relayClient.on('LOBBY_SYNC', (payload) => {
      if (payload?.seats && payload?.matchSeed) {
        syncLobbySnapshot(payload);
      }
    });

    const unsubStart = relayClient.on('LOBBY_START_MATCH', (payload) => {
      if (payload?.seats && payload?.matchSeed) {
        syncLobbySnapshot(payload);
      }
      navigate('home', { subpage: 'table' });
    });

    const unsubMsg = relayClient.onMessage((msg) => {
      if (msg.type === 'TURN_SYNC_SNAPSHOT' || msg.type === 'TURN_ACTION_COMMIT') {
        navigate('home', { subpage: 'table' });
      }
    });

    return () => {
      unsubSync();
      unsubStart();
      unsubMsg();
    };
  }, [navigate, relayClient, session.isHost, syncLobbySnapshot]);

  const handleRollRoomCode = () => {
    const next = rollRoomCode();
    relay.joinRoom(next);
  };

  const handleStartMatch = () => {
    if (session.seats.length < 2) {
      show({
        payload: {
          title: lang.lobby.needMorePlayers,
          tone: 'warning',
        },
      });
      return;
    }

    if (session.mode === 'websocket' && relay.status !== 'connected') {
      show({
        payload: {
          title: lang.lobby.connectionInfo,
          tone: 'warning',
        },
      });
      return;
    }

    const freshSeed = `${session.roomCode}-${Date.now()}`;
    startNewMatchSeed(freshSeed);

    if (session.isHost && relay.status === 'connected') {
      relay.send('LOBBY_START_MATCH', {
        seats: session.seats,
        matchSeed: freshSeed,
      });
    }
    navigate('home', { subpage: 'table' });
  };

  const qrPayload = encodeJoinQr({
    roomCode: session.roomCode,
    serverUrl: session.serverUrl,
    mode: session.mode,
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Room Code & Relay Status Card */}
      <AppCard
        variant="outlined"
        title={session.mode === 'simulated' ? lang.lobby.localGameTitle : lang.lobby.title}
        style={styles.card}
      >
        {session.mode === 'simulated' ? (
          <View style={styles.localHeaderRow}>
            <View style={styles.localHeaderCol}>
              <AppText variant="muted">{lang.lobby.localGameSubtitle}</AppText>
            </View>
            <AppBadge
              label={`${session.seats.length}/4`}
              tone="primary"
              variant="soft"
              size="sm"
            />
          </View>
        ) : (
          <View style={styles.codeHeaderRow}>
            <View style={styles.codeBlock}>
              <AppText variant="muted" style={styles.label}>
                {lang.lobby.roomCodeLabel}
              </AppText>
              <View style={styles.codeActionsRow}>
                <AppTitle level={2} style={{ color: theme.primary }}>
                  {session.roomCode}
                </AppTitle>
                {session.isHost && (
                  <AppButton
                    variant="outline"
                    tone="primary"
                    size="sm"
                    label={lang.lobby.rollCode}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    onPress={handleRollRoomCode}
                  />
                )}
              </View>
            </View>

            <View style={styles.statusBadges}>
              <AppBadge
                label={
                  relay.status === 'connected'
                    ? 'ONLINE'
                    : relay.status === 'reconnecting'
                      ? 'RECONNECTING'
                      : relay.status.toUpperCase()
                }
                tone={
                  relay.status === 'connected'
                    ? 'success'
                    : relay.status === 'reconnecting' || relay.status === 'connecting'
                      ? 'warning'
                      : 'neutral'
                }
                variant="solid"
                size="sm"
              />
              <AppBadge
                label={`${session.seats.length}/4`}
                tone="primary"
                variant="soft"
                size="sm"
              />
            </View>
          </View>
        )}

        {/* Connection status banner for WebSocket tables when not connected */}
        {session.mode === 'websocket' && relay.status !== 'connected' && (
          <View style={[styles.connectionAlert, { backgroundColor: theme.surfaceAlt, borderColor: theme.warning }]}>
            <View style={styles.alertHeaderRow}>
              <AlambreIcons.TriangleAlert color={theme.warning} lineWidth={1.75} style={styles.alertIcon} />
              <View style={styles.alertHeaderCol}>
                <AppText style={[styles.alertTitle, { color: theme.color }]}>
                  {relay.status === 'reconnecting'
                    ? lang.lobby.statusReconnecting
                    : relay.status === 'connecting'
                      ? lang.lobby.statusConnecting
                      : lang.lobby.statusDisconnected}
                </AppText>
                <AppText variant="muted" style={styles.alertServerText}>
                  {session.serverUrl}
                </AppText>
              </View>
            </View>

            <AppText variant="muted" style={styles.alertTipText}>
              {lang.lobby.lanRelayTip}
            </AppText>

            <View style={styles.alertActionsRow}>
              <AppButton
                variant="solid"
                tone="primary"
                size="sm"
                label={lang.lobby.reconnectAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                onPress={() => relay.connect()}
              />
              <AppButton
                variant="outline"
                tone="primary"
                size="sm"
                label={lang.lobby.resetToPcLanAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                onPress={() => {
                  setServerUrl(DEFAULT_LAN_RELAY);
                  relay.setServerUrl(DEFAULT_LAN_RELAY);
                  void saveField('wsServerUrl', DEFAULT_LAN_RELAY);
                  relay.connect();
                }}
              />
            </View>
          </View>
        )}

        {/* Dynamic QR Code for host screen (WebSocket multiplayer only) */}
        {session.isHost && session.mode === 'websocket' && (
          <View style={[styles.qrSection, { borderTopColor: theme.borderSoft }]}>
            <View style={styles.qrHeaderRow}>
              <View style={styles.qrHeaderCol}>
                <AppText style={[styles.qrTitle, { color: theme.color }]}>
                  {lang.lobby.qrTitle}
                </AppText>
                <AppText variant="muted" style={styles.qrSubtitle}>
                  {lang.lobby.qrSubtitle}
                </AppText>
              </View>
              <AppButton
                variant="ghost"
                tone="primary"
                size="sm"
                label={showQr ? lang.lobby.toggleQrHide : lang.lobby.toggleQrShow}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                onPress={() => setShowQr((prev) => !prev)}
              />
            </View>

            {showQr && (
              <View style={[styles.qrBox, { backgroundColor: theme.cardFace, borderColor: theme.border }]}>
                <QRCode
                  value={qrPayload}
                  size={150}
                  color={theme.color}
                  backgroundColor={theme.cardFace}
                />
              </View>
            )}
          </View>
        )}

        {session.mode === 'websocket' && (
          <View style={styles.sectionGap}>
            <AppTextInput
              label={lang.lobby.wsUrlLabel}
              value={session.serverUrl}
              onChangeText={(url) => {
                setServerUrl(url);
                relay.setServerUrl(url);
                void saveField('wsServerUrl', url);
              }}
              placeholder={config.wsServerUrl}
            />
          </View>
        )}
      </AppCard>

      {/* Table Seats (2 to 4 players) */}
      <AppCard
        variant="outlined"
        title={lang.lobby.seatsTitle}
        subtitle={lang.lobby.seatsSubtitle}
        style={styles.card}
      >
        <View style={styles.seatsList}>
          {session.seats.map((seat, index) => (
            <View
              key={seat.id}
              style={[
                styles.seatRow,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: seat.isHost ? theme.primary : theme.border,
                },
              ]}
            >
              <View style={styles.seatIdentity}>
                <AppText style={[styles.seatIndex, { color: theme.muted }]}>
                  #{index + 1}
                </AppText>
                <AppText style={[styles.seatName, { color: theme.color }]}>
                  {seat.name}
                </AppText>
              </View>

              <View style={styles.seatRight}>
                <AppBadge
                  label={
                    seat.isHost
                      ? lang.lobby.hostBadge
                      : seat.isBot
                        ? lang.lobby.botBadge
                        : lang.lobby.humanBadge
                  }
                  tone={seat.isHost ? 'primary' : seat.isBot ? 'neutral' : 'success'}
                  variant="soft"
                  size="sm"
                />
                {session.isHost && seat.isBot && (
                  <AppButton
                    variant="ghost"
                    tone="danger"
                    size="sm"
                    label={lang.lobby.removeSeat}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`${lang.lobby.removeSeat}: ${seat.name}`}
                    onPress={() => removeSeat(seat.id)}
                  />
                )}
              </View>
            </View>
          ))}
        </View>

        {session.isHost && session.seats.length < 4 && (
          <AppButton
            variant="soft"
            tone="primary"
            size="md"
            label={lang.lobby.addBot}
            accessibilityRole="button"
            onPress={addBotSeat}
            fullWidth
          />
        )}
      </AppCard>

      {/* Fixed Classic Rules Card */}
      <AppCard
        variant="outlined"
        title={lang.lobby.rulesSummaryTitle}
        style={styles.card}
      >
        <AppText variant="muted" style={styles.rulesText}>
          {lang.lobby.rulesSummaryBody}
        </AppText>

        <AppButton
          variant="solid"
          tone="primary"
          size="lg"
          label={`${lang.lobby.startMatch} (${sanitizeRoomCode(session.roomCode)})`}
          disabled={session.seats.length < 2}
          accessibilityRole="button"
          onPress={handleStartMatch}
          fullWidth
        />
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  card: {
    borderWidth: 1.5,
    gap: 12,
  },
  localHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  localHeaderCol: {
    flex: 1,
  },
  codeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  codeBlock: {
    gap: 4,
  },
  codeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrSection: {
    gap: 10,
    paddingVertical: 4,
    borderTopWidth: 1,
    marginTop: 4,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrHeaderCol: {
    flex: 1,
    gap: 2,
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  qrSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  qrBox: {
    alignSelf: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionGap: {
    gap: 6,
    marginTop: 4,
  },
  seatsList: {
    gap: 8,
    marginVertical: 4,
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  seatIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  seatIndex: {
    fontSize: 13,
    fontWeight: '700',
  },
  seatName: {
    fontSize: 15,
    fontWeight: '700',
  },
  seatRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rulesText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  connectionAlert: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertIcon: {
    width: 20,
    height: 20,
  },
  alertHeaderCol: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertServerText: {
    fontSize: 11,
  },
  alertTipText: {
    fontSize: 12,
    lineHeight: 16,
  },
  alertActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
});
