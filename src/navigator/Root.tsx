import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import {
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useNavigator } from 'alambre';
import type { Page } from 'alambre';
import { useLightDark } from '../providers/theme';
import { useLang } from '../providers/lang';
import { pages, type PageTitleFn } from './navigator';
import { ThemeProvider } from '@some-alambre/ui';
import AppNavigatorBody from './AppNavigatorBody';

const resolvePageTitle = (
  page: Page,
): PageTitleFn | undefined => {
  for (const entry of Object.values(pages)) {
    if (entry === page) return entry.title;
    if (entry.subpages) {
      for (const sub of Object.values(entry.subpages)) {
        if (sub === page) return sub.title;
      }
    }
  }
  return undefined;
};

export default () => {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { currentPage } = useNavigator();

  const titleFn = resolvePageTitle(currentPage);
  const headerTitle = titleFn ? titleFn(lang) : undefined;


  return (
    <ThemeProvider theme={theme}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <AppNavigatorBody
          style={styles.container}
          arrowColor={theme.primary}
          arrowBackgroundColor={theme.surfaceAlt}
          arrowBorderColor={theme.border}
          headerStyle={{ backgroundColor: theme.surfaceAlt }}
          titleColor={theme.color}
          headerTitle={headerTitle}
          animations={{
            go: {
              pageEntering: FadeIn.duration(200).easing(Easing.out(Easing.cubic)),
            },
            return: {
              pageEntering: FadeIn.duration(200).easing(Easing.out(Easing.cubic)),
            },
          }}
          useNavigator={useNavigator}
        />
      </SafeAreaView>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
