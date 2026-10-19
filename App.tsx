import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { Nunito_400Regular } from '@expo-google-fonts/nunito';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { Kranky_400Regular } from '@expo-google-fonts/kranky';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Root from './src/navigator/Root';
import { ConfirmProvider, NavigatorProvider, ToastProvider } from 'alambre';
import navigator from './src/navigator/navigator';
import { TemplateToast } from './src/providers/toast';
import { ConfirmDialog } from '@some-alambre/ui';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    Nunito: Nunito_400Regular,
    PlayfairDisplay: PlayfairDisplay_400Regular,
    SpaceMono: SpaceMono_400Regular,
    Kranky: Kranky_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigatorProvider pages={navigator}>
          <ConfirmProvider ConfirmComponent={ConfirmDialog}>
            <ToastProvider ToastComponent={TemplateToast}>
              <Root />
            </ToastProvider>
          </ConfirmProvider>
        </NavigatorProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
