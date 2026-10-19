const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const alambrePackage = path.resolve(workspaceRoot, 'packages/alambre/package.json');

const config = getDefaultConfig(projectRoot);

// Inside the alambre monorepo: resolve the library from its TypeScript source
// for Fast Refresh. Standalone (template export) keeps the default resolution
// so `alambre` is loaded from node_modules through the published `exports`.
if (fs.existsSync(alambrePackage)) {
  config.watchFolders = [workspaceRoot];
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ];

  const alambreSource = path.resolve(workspaceRoot, 'packages/alambre/src/index.ts');
  const uiSource = path.resolve(workspaceRoot, 'packages/ui/src/index.ts');

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'alambre') {
      return { filePath: alambreSource, type: 'sourceFile' };
    }
    if (moduleName === '@some-alambre/ui' || moduleName === '@alambre/ui') {
      return { filePath: uiSource, type: 'sourceFile' };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
