import Home from '../views/home/Home';
import Details from '../views/home/Details';
import Settings from '../views/settings/Settings';
import Permissions from '../views/settings/Permissions';
import type { Page } from 'alambre';
import type { AppLang } from '../providers/lang';

export type PageTitleFn = (lang: AppLang) => string;

export type AppPage = Page & {
  title?: PageTitleFn;
  subpages?: Record<string, AppPage>;
};

export const pages: Record<string, AppPage> = {
  home: {
    component: <Home />,
    subpages: {
      details: {
        title: (lang) => lang.details.title,
        component: <Details />,
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

