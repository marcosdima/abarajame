import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { AlambreIcons, useNavigator, useToast } from 'alambre';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { sanitizeRoomCode } from '@some-alambre/room-relay';
import {
  AppAccordion,
  AppBadge,
  AppButton,
  AppCard,
  AppSegmentedControl,
  AppText,
  AppTextInput,
  AppTitle,
} from '@some-alambre/ui';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import {
  useConfig,
  saveField,
  DEFAULT_PUBLIC_RELAY,
  DEFAULT_LAN_RELAY,
} from '../../providers/config';
import { useTableSession } from '../../providers/table-session';
import { parseJoinQr } from '../../utils/qr';

export default function MultiplayerHub() {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { config } = useConfig();
  const { navigate } = useNavigator();
  const { show } = useToast();
  const { createHostTable, joinGuestTable } = useTableSession();

  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    if (config.transportMode !== 'websocket') {
      void saveField('transportMode', 'websocket');
    }
  }, [config.transportMode]);

  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const response = await requestCameraPermission();
      if (!response.granted) {
        show({
          payload: {
            title: lang.multiplayer.scannerPermissionDenied,
            tone: 'warning',
          },
        });
        return;
      }
    }
    setIsScanning(true);
  };

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (!isScanning) return;
      const parsed = parseJoinQr(result.data);
      if (!parsed || !parsed.roomCode) return;

      setIsScanning(false);

      const targetServer = parsed.serverUrl || config.wsServerUrl || DEFAULT_PUBLIC_RELAY;

      if (parsed.serverUrl) {
        void saveField('wsServerUrl', parsed.serverUrl);
      }
      void saveField('transportMode', 'websocket');

      show({
        payload: {
          title: `${lang.multiplayer.scannerDetectedToast} (${parsed.roomCode})`,
          tone: 'success',
        },
      });

      joinGuestTable({
        roomCode: parsed.roomCode,
        playerName: config.playerName || 'Invitado',
        mode: 'websocket',
        serverUrl: targetServer,
      });

      navigate('home', { subpage: 'lobby' });
    },
    [config.playerName, config.wsServerUrl, isScanning, joinGuestTable, lang.multiplayer.scannerDetectedToast, navigate, show],
  );

  const handleCreatePrivateTable = () => {
    createHostTable({
      playerName: config.playerName || 'Jugador',
      mode: 'websocket',
      serverUrl: config.wsServerUrl,
    });
    navigate('home', { subpage: 'lobby' });
  };

  const handleJoinManual = () => {
    const cleanCode = sanitizeRoomCode(manualCode);
    if (cleanCode.length < 3) {
      show({
        payload: {
          title: lang.multiplayer.invalidCodeAlert,
          tone: 'warning',
        },
      });
      return;
    }

    joinGuestTable({
      roomCode: cleanCode,
      playerName: config.playerName || 'Invitado',
      mode: 'websocket',
      serverUrl: config.wsServerUrl,
    });
    navigate('home', { subpage: 'lobby' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header section */}
      <Animated.View entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}>
        <View style={styles.headerRow}>
          <View style={styles.headerCol}>
            <AppTitle level={2} style={{ color: theme.color }}>
              {lang.multiplayer.title}
            </AppTitle>
            <AppText variant="muted">{lang.multiplayer.subtitle}</AppText>
          </View>
        </View>
      </Animated.View>

      {/* Main Mode Selector: Unirse vs Crear */}
      <Animated.View entering={FadeInDown.duration(260).delay(40).easing(Easing.out(Easing.cubic))}>
        <AppSegmentedControl
          options={[
            { label: lang.multiplayer.tabJoin, value: 'join' },
            { label: lang.multiplayer.tabCreate, value: 'create' },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'join' | 'create')}
        />
      </Animated.View>

      {/* TAB: UNIRSE A MESA */}
      {activeTab === 'join' && (
        <Animated.View
          entering={FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}
          style={styles.tabContent}
        >
          <AppCard
            variant="outlined"
            title={lang.multiplayer.joinTitle}
            subtitle={lang.multiplayer.joinSubtitle}
            style={styles.card}
          >
            {/* Primary Action: QR Scanner */}
            <AppButton
              variant="solid"
              tone="primary"
              size="lg"
              label={lang.multiplayer.scanQrAction}
              accessibilityRole="button"
              accessibilityLabel={lang.multiplayer.scanQrAction}
              leftIcon={<AlambreIcons.Search color={theme.onPrimary} lineWidth={1.75} style={styles.btnIcon} />}
              onPress={handleOpenScanner}
              fullWidth
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <AppText variant="muted" style={styles.dividerText}>
                {lang.multiplayer.orManualCode}
              </AppText>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Secondary Action: Manual Code Input */}
            <View style={styles.joinRow}>
              <View style={styles.codeInputCol}>
                <AppTextInput
                  value={manualCode}
                  onChangeText={(txt) => setManualCode(txt.toUpperCase())}
                  placeholder={lang.multiplayer.roomCodePlaceholder}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel={lang.multiplayer.roomCodePlaceholder}
                />
              </View>
              <AppButton
                variant="outline"
                tone="primary"
                size="md"
                label={lang.multiplayer.joinAction}
                accessibilityRole="button"
                onPress={handleJoinManual}
              />
            </View>
          </AppCard>
        </Animated.View>
      )}

      {/* TAB: CREAR MESA */}
      {activeTab === 'create' && (
        <Animated.View
          entering={FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}
          style={styles.tabContent}
        >
          <AppCard
            variant="outlined"
            title={lang.multiplayer.createTitle}
            subtitle={lang.multiplayer.createSubtitle}
            style={styles.card}
          >
            <View style={styles.infoBox}>
              <AppBadge
                label={config.wsServerUrl === DEFAULT_PUBLIC_RELAY ? 'Online' : 'LAN'}
                tone="success"
                variant="soft"
                size="sm"
              />
              <AppText variant="muted" style={styles.infoBoxText}>
                {config.wsServerUrl === DEFAULT_PUBLIC_RELAY
                  ? lang.multiplayer.cloudRelayDesc
                  : lang.multiplayer.lanRelayDesc}
              </AppText>
            </View>

            <AppButton
              variant="solid"
              tone="primary"
              size="lg"
              label={lang.multiplayer.createAction}
              accessibilityRole="button"
              onPress={handleCreatePrivateTable}
              fullWidth
            />
          </AppCard>
        </Animated.View>
      )}

      {/* Advanced Connection Settings using AppAccordion */}
      <Animated.View entering={FadeInDown.duration(260).delay(80).easing(Easing.out(Easing.cubic))}>
        <AppAccordion
          title={lang.multiplayer.advancedSettingsTitle}
          subtitle={config.wsServerUrl}
          style={styles.card}
        >
          <View style={styles.advancedBody}>
            <View style={styles.fieldGroup}>
              <AppText variant="muted" style={styles.fieldLabel}>
                {lang.multiplayer.transportLabel}
              </AppText>
              <AppSegmentedControl
                options={[
                  { label: lang.multiplayer.cloudRelayTitle, value: 'cloud' },
                  { label: lang.multiplayer.lanRelayTitle, value: 'lan' },
                ]}
                value={config.wsServerUrl === DEFAULT_LAN_RELAY ? 'lan' : 'cloud'}
                onChange={(val) => {
                  void saveField('transportMode', 'websocket');
                  if (val === 'lan') {
                    void saveField('wsServerUrl', DEFAULT_LAN_RELAY);
                  } else {
                    void saveField('wsServerUrl', DEFAULT_PUBLIC_RELAY);
                  }
                }}
              />
            </View>

            <View style={styles.fieldGroup}>
              <AppTextInput
                label={lang.multiplayer.serverUrlLabel}
                value={config.wsServerUrl}
                onChangeText={(url) => void saveField('wsServerUrl', url)}
                placeholder={DEFAULT_PUBLIC_RELAY}
              />
              <AppText variant="muted" style={styles.hintText}>
                {lang.multiplayer.serverUrlHint}
              </AppText>
              <AppButton
                variant="outline"
                tone="primary"
                size="sm"
                label={lang.multiplayer.resetToDefaultAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                onPress={() => void saveField('wsServerUrl', DEFAULT_LAN_RELAY)}
              />
            </View>
          </View>
        </AppAccordion>
      </Animated.View>

      {/* Fullscreen Camera QR Scanner Modal */}
      <Modal
        visible={isScanning}
        animationType="slide"
        presentationStyle="fullScreen"
        accessibilityViewIsModal={true}
        onRequestClose={() => setIsScanning(false)}
      >
        <View style={[styles.scannerContainer, { backgroundColor: theme.background }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          {/* Scanner Overlay UI with Semantic Theme Tokens */}
          <View style={styles.scannerOverlay}>
            <View style={[styles.scannerTopBar, { backgroundColor: theme.overlay }]}>
              <AppTitle level={3} style={{ color: theme.cardFace }}>
                {lang.multiplayer.scannerTitle}
              </AppTitle>
              <AppText style={{ color: theme.cardFace, fontSize: 13, textAlign: 'center' }}>
                {lang.multiplayer.scannerHint}
              </AppText>
            </View>

            <View style={styles.scannerReticleContainer}>
              <View style={[styles.scannerReticle, { borderColor: theme.success }]}>
                <View style={[styles.cornerTL, { borderColor: theme.success }]} />
                <View style={[styles.cornerTR, { borderColor: theme.success }]} />
                <View style={[styles.cornerBL, { borderColor: theme.success }]} />
                <View style={[styles.cornerBR, { borderColor: theme.success }]} />
              </View>
            </View>

            <View style={styles.scannerBottomBar}>
              <AppButton
                variant="solid"
                tone="neutral"
                size="lg"
                label={lang.multiplayer.scannerClose}
                accessibilityRole="button"
                onPress={() => setIsScanning(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerCol: {
    gap: 4,
  },
  card: {
    borderWidth: 1.5,
    gap: 12,
  },
  tabContent: {
    gap: 12,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnIcon: {
    width: 20,
    height: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeInputCol: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  advancedBody: {
    gap: 12,
    paddingTop: 8,
  },
  hintText: {
    fontSize: 11,
    lineHeight: 15,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  scannerTopBar: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  scannerReticleContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerReticle: {
    width: 230,
    height: 230,
    borderWidth: 1,
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scannerBottomBar: {
    width: '100%',
    alignItems: 'center',
  },
});
