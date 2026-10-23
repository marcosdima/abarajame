import Home from '../views/home/Home';
import MultiplayerHub from '../views/home/MultiplayerHub';
import GameCatalog from '../views/home/GameCatalog';
import MatchHistoryView from '../views/home/MatchHistoryView';
import Lobby from '../views/table/Lobby';
import GameTable from '../views/table/GameTable';
import Settings from '../views/settings/Settings';
import Permissions from '../views/settings/Permissions';
import type { Page } from 'alambre';
import type { AppLang } from '../providers/lang';

export type PageTitleFn = (lang: AppLang) => string;

export type AppPage = Page & {
  title?: PageTitleFn;
  scrollable?: boolean;
  hideBackArrow?: boolean;
  subpages?: Record<string, AppPage>;
};

export const pages: Record<string, AppPage> = {
  home: {
    component: <Home />,
    subpages: {
      multiplayer: {
        title: (lang) => lang.multiplayer.title,
        component: <MultiplayerHub />,
      },
      catalog: {
        title: (lang) => lang.catalog.title,
        component: <GameCatalog />,
      },
      history: {
        title: (lang) => lang.history.title,
        component: <MatchHistoryView />,
      },
      lobby: {
        title: (lang) => lang.lobby.title,
        component: <Lobby />,
      },
      table: {
        scrollable: false,
        hideBackArrow: true,
        component: <GameTable />,
      },
    },
  },
  settings: {
    title: (lang) => lang.settings.title,
    component: <Settings />,
    subpages: {
      permissions: {
        title: (lang) => lang.permissions.title,
        component: <Permissions />,
      },
    },
  },
};

export default pages;
