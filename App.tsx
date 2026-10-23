import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Kranky_400Regular } from '@expo-google-fonts/kranky';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Root from './src/navigator/Root';
import { ConfirmProvider, NavigatorProvider, ToastProvider } from 'alambre';
import navigator from './src/navigator/navigator';
import { TemplateToast } from './src/providers/toast';
import { ConfirmDialog, ThemeProvider } from '@some-alambre/ui';
import { useLightDark } from './src/providers/theme';
import { useConfig } from './src/providers/config';
import StartupAceLoader from './src/components/common/StartupAceLoader';
import NicknameSetup from './src/components/common/NicknameSetup';

function AppContent() {
  const { theme } = useLightDark();
  const { config, saveField } = useConfig();
  const [startupFinished, setStartupFinished] = useState(false);

  const isAliasUndefined =
    !config.playerName ||
    config.playerName.trim() === '' ||
    config.playerName.trim() === 'Jugador 1';

  return (
    <ThemeProvider key={config.fontFamily} theme={{ ...theme, fontFamily: config.fontFamily }}>
      <NavigatorProvider pages={navigator}>
        <ConfirmProvider ConfirmComponent={ConfirmDialog}>
          <ToastProvider ToastComponent={TemplateToast}>
            {!startupFinished ? (
              <StartupAceLoader onFinish={() => setStartupFinished(true)} />
            ) : isAliasUndefined ? (
              <NicknameSetup
                onSave={(nickname) => void saveField('playerName', nickname)}
              />
            ) : (
              <Root />
            )}
          </ToastProvider>
        </ConfirmProvider>
      </NavigatorProvider>
    </ThemeProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Bold': Inter_700Bold,
    'Inter_bold': Inter_700Bold,
    Inter_700Bold,
    Nunito: Nunito_400Regular,
    'Nunito-Bold': Nunito_700Bold,
    'Nunito_bold': Nunito_700Bold,
    Nunito_700Bold,
    PlayfairDisplay: PlayfairDisplay_400Regular,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'PlayfairDisplay_bold': PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold,
    SpaceMono: SpaceMono_400Regular,
    'SpaceMono-Bold': SpaceMono_700Bold,
    'SpaceMono_bold': SpaceMono_700Bold,
    SpaceMono_700Bold,
    Kranky: Kranky_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppContent />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
