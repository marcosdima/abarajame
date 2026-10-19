import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Pressable, BackHandler, View } from 'react-native';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';
import type { NavigatorReturn } from 'alambre';
import { AlambreIcons } from 'alambre';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { EntryOrExitLayoutType } from 'react-native-reanimated';
import { kinetics } from 'alambre';

type AppNavigatorAnimations = {
  pageEntering?: EntryOrExitLayoutType;
  pageExiting?: EntryOrExitLayoutType;
};

type AppNavigatorBodyProps = ComponentProps<typeof View> & {
  arrowColor?: ColorValue;
  arrowBackgroundColor?: ColorValue;
  arrowBorderColor?: ColorValue;
  width?: number;
  pressStyle?: StyleProp<ViewStyle>;
  headerTitle?: string;
  titleColor?: ColorValue;
  headerStyle?: StyleProp<ViewStyle>;
  animations?: {
    go?: AppNavigatorAnimations;
    return?: AppNavigatorAnimations;
  };
  useNavigator: () => NavigatorReturn;
};

export default ({
  style,
  animations,
  arrowColor = 'black',
  arrowBackgroundColor = 'rgba(15, 23, 42, 0.16)',
  arrowBorderColor,
  width = 4,
  headerTitle,
  titleColor = 'black',
  headerStyle,
  useNavigator,
  ...props
}: AppNavigatorBodyProps) => {
  const {
    previous,
    currentPage,
    noPreviousPages,
    pageKey,
    scrollTop,
    setScrollTop,
  } = useNavigator();

  const scale = useSharedValue(1);
  const iconVisible = useSharedValue(0);
  const detailsVisible = useSharedValue(0);
  const [drawArrow, setDrawArrow] = useState(false);

  const headerMode = headerTitle !== undefined && !noPreviousPages;
  const canShowArrow = headerMode || (!noPreviousPages && scrollTop <= 4);

  useEffect(() => {
    if (canShowArrow) {
      setDrawArrow(false);
      iconVisible.value = withTiming(1, kinetics.timing.fast);

      const drawTimer = setTimeout(() => {
        setDrawArrow(true);
      }, 40);

      const detailsTimer = setTimeout(() => {
        detailsVisible.value = withTiming(1, kinetics.timing.base);
      }, 160);

      return () => {
        clearTimeout(drawTimer);
        clearTimeout(detailsTimer);
      };
    }

    setDrawArrow(false);
    detailsVisible.value = withTiming(0, kinetics.timing.fast);
    iconVisible.value = withTiming(0, kinetics.timing.fast);
  }, [canShowArrow, detailsVisible, iconVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: iconVisible.value * (0.55 + detailsVisible.value * 0.45),
    transform: [
      { translateY: (1 - detailsVisible.value) * -6 },
      { scale: scale.value },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconVisible.value,
    transform: [{ scale: scale.value }],
  }));

  const isReturningRef = useRef(false);

  const onPressIn = () => {
    scale.value = withTiming(0.85, kinetics.timing.slow);
  };

  const onPressOut = () => {
    scale.value = withSpring(1, kinetics.spring.bouncy);
    isReturningRef.current = true;
    setTimeout(previous, 10);
  };

  const arrowButton = (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={!canShowArrow}
      hitSlop={12}
    >
      <Animated.View style={[styles.iconBody, iconStyle]}>
        <AlambreIcons.Arrow
          drawIt={drawArrow}
          iconAnimation={{
            drawAnimation: (value: number) => withTiming(value, kinetics.timing.slow),
            resetAnimation: (value: number) => withTiming(value, {
              duration: 160,
              easing: Easing.in(Easing.quad),
            }),
          }}
          color={arrowColor}
          lineWidth={width}
          rotation={180}
        />
      </Animated.View>
    </Pressable>
  );

  const pillBorder = arrowBorderColor
    ? { borderColor: arrowBorderColor, borderWidth: StyleSheet.hairlineWidth }
    : null;

  const {
    pressStyle = {
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 999,
      minWidth: 44,
      height: 34,
      paddingHorizontal: 10,
      borderRadius: 18,
      backgroundColor: arrowBackgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      ...pillBorder,
    },
  } = props;

  const direction = isReturningRef.current ? 'return' : 'go';
  const animationsSelected = direction === 'return' ? animations?.return : animations?.go;

  const enterAnimation = animationsSelected?.pageEntering
    ?? FadeInDown.duration(500).delay(350).easing(Easing.ease);

  useEffect(() => {
    isReturningRef.current = false;
  }, [pageKey]);

  useEffect(() => {
    const onHardwareBack = () => {
      if (!noPreviousPages) {
        isReturningRef.current = true;
        previous();
        return true;
      }
      return false;
    };

    const sub = BackHandler?.addEventListener?.('hardwareBackPress', onHardwareBack);
    return () => {
      sub?.remove?.();
    };
  }, [noPreviousPages, previous]);

  return (
    <View
      style={[{ position: 'relative', flex: 1 }, style]}
      {...props}
    >
      {headerMode && (
        <Animated.View
          key="page-header"
          entering={FadeInDown.duration(240).delay(60).easing(Easing.out(Easing.cubic))}
          style={[styles.header, headerStyle]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.arrowSlot, pillBorder, animatedStyle]}
            pointerEvents={noPreviousPages ? 'none' : 'auto'}
          >
            {arrowButton}
          </Animated.View>
          <Animated.Text
            key={headerTitle}
            style={[styles.headerTitle, { color: titleColor }]}
            entering={FadeIn.duration(180)}
            numberOfLines={1}
          >
            {headerTitle}
          </Animated.Text>
        </Animated.View>
      )}

      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageScrollContent}
        onScroll={(event) => setScrollTop(Math.max(0, event.nativeEvent.contentOffset.y))}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={pageKey}
          style={styles.pageContainer}
          entering={enterAnimation}
        >
          {currentPage.component}
        </Animated.View>
      </ScrollView>

      {!headerMode && (
        <Animated.View
          style={[pressStyle, animatedStyle]}
          pointerEvents={canShowArrow ? 'auto' : 'none'}
        >
          {arrowButton}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 12,
    gap: 8,
  },
  arrowSlot: {
    minWidth: 44,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  pageScroll: {
    flex: 1,
    width: '100%',
  },
  pageScrollContent: {
    flexGrow: 1,
  },
  pageContainer: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
  },
  iconBody: {
    width: 28,
    height: 28,
  },
});
