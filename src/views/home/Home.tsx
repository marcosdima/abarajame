import { Text, View, StyleSheet } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useNavigator, useToast, useStagger } from 'alambre';
import { useLightDark } from '../../providers/theme';
import { useLang } from '../../providers/lang';
import { useConfig } from '../../providers/config';
import { AppTitle, AppButton } from '@some-alambre/ui';

export default () => {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { config } = useConfig();
  const { navigate } = useNavigator();
  const { show } = useToast();
  const { getDelay } = useStagger({ initialDelay: 80, staggerMs: 60 });

  const navItems = [
    { key: 'details', label: lang.home.openDetails, onPress: () => navigate('home', { subpage: 'details' }) },
    { key: 'settings', label: lang.home.openSettings, onPress: () => navigate('settings') },
    { key: 'toast', label: lang.home.showToast, onPress: () => show({ payload: lang.home.title }) },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View
        entering={FadeInDown.duration(300).delay(getDelay(0)).easing(Easing.out(Easing.cubic))}
      >
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppTitle style={{ color: theme.color }}>{lang.home.title}</AppTitle>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{lang.home.subtitle}</Text>
          <Text style={{ color: theme.primary }}>{config.greeting}</Text>
        </View>
      </Animated.View>

      {navItems.map((item, index) => (
        <Animated.View
          key={item.key}
          entering={FadeInDown.duration(280).delay(getDelay(index + 1)).easing(Easing.out(Easing.cubic))}
        >
          <AppButton onPress={item.onPress}>
            <Text style={{ color: theme.primary }}>{item.label}</Text>
          </AppButton>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
});
