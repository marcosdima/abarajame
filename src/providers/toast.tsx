import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ToastComponentProps } from 'alambre';
import { AlambreIcons, parseToastPayload, useNavigator } from 'alambre';
import { useLightDark } from './theme';
import { kinetics } from 'alambre';

export function TemplateToast({ toast, dismiss, queueLength }: ToastComponentProps) {
  const { theme } = useLightDark();
  const { noPreviousPages } = useNavigator();
  const insets = useSafeAreaInsets();
  const { data } = toast;

  const parsed = parseToastPayload(data.payload);
  const isTop = parsed.position !== 'bottom';

  // Base clearance: status bar or bottom bar
  const baseTop = Math.max(insets.top, 16);
  const targetTop = baseTop + (noPreviousPages ? 10 : 66);
  const targetBottom = Math.max(insets.bottom, 16) + 16;

  const animatedOffset = useSharedValue(isTop ? targetTop : targetBottom);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const progressWidth = useSharedValue(100);
  const [isGestureDismissed, setIsGestureDismissed] = useState(false);

  useEffect(() => {
    animatedOffset.value = withTiming(isTop ? targetTop : targetBottom, kinetics.timing.base);
  }, [isTop, targetTop, targetBottom, animatedOffset]);

  // Progress bar animation for auto-dismissing toasts
  useEffect(() => {
    if (data.persistent || data.actions?.length) return;
    progressWidth.value = 100;
    progressWidth.value = withTiming(0, {
      duration: data.duration ?? 4000,
      easing: Easing.linear,
    });
  }, [data.id, data.duration, data.persistent, data.actions, progressWidth]);

  // Reset gesture transforms on new toast
  useEffect(() => {
    setIsGestureDismissed(false);
    translateX.value = 0;
    translateY.value = 0;
  }, [data.id, translateX, translateY]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      if (isTop) {
        translateY.value = event.translationY < 0 ? event.translationY : event.translationY * 0.2;
      } else {
        translateY.value = event.translationY > 0 ? event.translationY : event.translationY * 0.2;
      }
    })
    .onEnd((event) => {
      const dismissUp = isTop && (event.translationY < -35 || event.velocityY < -350);
      const dismissDown = !isTop && (event.translationY > 35 || event.velocityY > 350);
      const dismissHoriz = Math.abs(event.translationX) > 85 || Math.abs(event.velocityX) > 600;

      if (dismissUp) {
        runOnJS(setIsGestureDismissed)(true);
        translateY.value = withTiming(-160, kinetics.timing.base, () => {
          runOnJS(dismiss)(data.id);
        });
      } else if (dismissDown) {
        runOnJS(setIsGestureDismissed)(true);
        translateY.value = withTiming(160, kinetics.timing.base, () => {
          runOnJS(dismiss)(data.id);
        });
      } else if (dismissHoriz) {
        runOnJS(setIsGestureDismissed)(true);
        const dir = Math.sign(event.translationX || event.velocityX || 1);
        translateX.value = withTiming(dir * 500, kinetics.timing.base, () => {
          runOnJS(dismiss)(data.id);
        });
      } else {
        translateX.value = withSpring(0, kinetics.spring.snappy);
        translateY.value = withSpring(0, kinetics.spring.snappy);
      }
    });

  const animatedPositionStyle = useAnimatedStyle(() => {
    if (isTop) {
      return { top: animatedOffset.value };
    }
    return { bottom: animatedOffset.value };
  });

  const animatedGestureStyle = useAnimatedStyle(() => {
    const dragDist = Math.max(Math.abs(translateX.value), Math.abs(translateY.value));
    const opacity = interpolate(
      dragDist,
      [0, 60, 220],
      [1, 0.85, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      opacity,
    };
  });

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Semantic tone configuration
  const tone = parsed.tone ?? 'info';
  const getToneDetails = () => {
    switch (tone) {
      case 'success':
        return {
          accent: '#10b981',
          bgBadge: '#10b98120',
          Icon: AlambreIcons.CircleCheck,
        };
      case 'warning':
        return {
          accent: '#f59e0b',
          bgBadge: '#f59e0b20',
          Icon: AlambreIcons.TriangleAlert,
        };
      case 'danger':
        return {
          accent: '#ef4444',
          bgBadge: '#ef444420',
          Icon: AlambreIcons.CircleX,
        };
      case 'info':
      default:
        return {
          accent: theme.primary,
          bgBadge: theme.primarySoft,
          Icon: null,
        };
    }
  };

  const toneConfig = getToneDetails();
  const IconComponent = toneConfig.Icon;

  const enterAnimation = isTop
    ? FadeInDown.duration(260).easing(Easing.out(Easing.cubic))
    : FadeInUp.duration(260).easing(Easing.out(Easing.cubic));

  const exitAnimation = isTop
    ? FadeOutUp.duration(220).easing(Easing.in(Easing.cubic))
    : FadeOutDown.duration(220).easing(Easing.in(Easing.cubic));

  const showProgressBar = !data.persistent && (!data.actions || data.actions.length === 0);

  return (
    <Animated.View
      style={[styles.root, animatedPositionStyle]}
      pointerEvents="box-none"
    >
      <Animated.View
        key={data.id}
        entering={enterAnimation}
        exiting={isGestureDismissed ? undefined : exitAnimation}
        style={styles.cardWrapper}
        pointerEvents="box-none"
      >
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.card,
              animatedGestureStyle,
              {
                backgroundColor: theme.surface,
                borderColor: toneConfig.accent,
              },
            ]}
          >
            {/* Tone Accent Bar on Left */}
            <View style={[styles.accentStrip, { backgroundColor: toneConfig.accent }]} />

            <View style={styles.contentRow}>
              {/* Tone Icon */}
              <View style={[styles.iconWrapper, { backgroundColor: toneConfig.bgBadge }]}>
                {IconComponent ? (
                  <IconComponent
                    color={toneConfig.accent}
                    lineWidth={2.2}
                    style={styles.toneIcon}
                  />
                ) : (
                  <Text style={[styles.infoMark, { color: toneConfig.accent }]}>ℹ</Text>
                )}
              </View>

              {/* Message Body */}
              <View style={styles.textContainer}>
                {parsed.title ? (
                  <Text style={[styles.title, { color: theme.color }]} numberOfLines={1}>
                    {parsed.title}
                  </Text>
                ) : null}
                {parsed.content ? (
                  <Text style={[styles.content, { color: theme.color }]}>{parsed.content}</Text>
                ) : null}

                {/* Action Buttons if any */}
                {data.actions && data.actions.length > 0 ? (
                  <View style={styles.actionsRow}>
                    {data.actions.map((action, idx) => {
                      const isDanger = action.tone === 'danger';
                      const btnColor = isDanger ? '#ef4444' : toneConfig.accent;
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => {
                            action.onPress();
                            dismiss(data.id);
                          }}
                          style={[styles.actionBtn, { borderColor: btnColor }]}
                          hitSlop={8}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.actionBtnText, { color: btnColor }]}>
                            {action.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              {/* Queue Counter Badge */}
              {queueLength > 0 ? (
                <View
                  style={[
                    styles.queueBadge,
                    { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.queueBadgeText, { color: theme.muted }]}>
                    +{queueLength}
                  </Text>
                </View>
              ) : null}

              {/* Dismiss Cross */}
              <Pressable
                onPress={() => dismiss(data.id)}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityRole="button"
              >
                <Text style={[styles.closeText, { color: theme.muted }]}>✕</Text>
              </Pressable>
            </View>

            {/* Progress Countdown Bar */}
            {showProgressBar ? (
              <View style={[styles.progressTrack, { backgroundColor: theme.surfaceAlt }]}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    progressBarStyle,
                    { backgroundColor: toneConfig.accent },
                  ]}
                />
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    zIndex: 999,
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '92%',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 14,
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneIcon: {
    width: 20,
    height: 20,
  },
  infoMark: {
    fontSize: 16,
    fontWeight: '800',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  queueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  queueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
});
