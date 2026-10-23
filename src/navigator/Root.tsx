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
import { useConfig } from '../providers/config';
import { pages, type PageTitleFn } from './navigator';
import AppNavigatorBody from './AppNavigatorBody';

const resolvePageMeta = (
  page: Page,
): { title?: PageTitleFn; scrollable: boolean; hideBackArrow?: boolean } => {
  for (const entry of Object.values(pages)) {
    if (entry === page) {
      return {
        title: entry.title,
        scrollable: entry.scrollable ?? true,
        hideBackArrow: entry.hideBackArrow,
      };
    }
    if (entry.subpages) {
      for (const sub of Object.values(entry.subpages)) {
        if (sub === page) {
          return {
            title: sub.title,
            scrollable: sub.scrollable ?? true,
            hideBackArrow: sub.hideBackArrow,
          };
        }
      }
    }
  }
  return { scrollable: true };
};

export default () => {
  const { theme } = useLightDark();
  const { lang } = useLang();
  const { config } = useConfig();
  const { currentPage } = useNavigator();

  const { title: titleFn, scrollable, hideBackArrow } = resolvePageMeta(currentPage);
  const headerTitle = titleFn ? titleFn(lang) : undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppNavigatorBody
        style={styles.container}
        arrowColor={theme.primary}
        arrowBackgroundColor={theme.surfaceAlt}
        arrowBorderColor={theme.border}
        headerStyle={{ backgroundColor: theme.surfaceAlt }}
        titleColor={theme.color}
        headerTitle={headerTitle}
        fontFamily={config.fontFamily}
        scrollable={scrollable}
        hideBackArrow={hideBackArrow}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
