const { build: buildPackUp, utils } = require('@strapi/pack-up');
const { build: buildVite, loadConfigFromFile, mergeConfig } = require('vite');
const { existsSync } = require('fs');

const VITE_CONFIG_PATH = 'vite.config.mjs';

const dir = process.cwd();
const project = process.env.NX_PROJECT_ROOT_PATH;
const logger = utils.createLogger({ debug: false, silent: true });

console.log('Building', project);

const updatePackUpConfig = (config) => {
  return {
    ...config,
    bundles: config.bundles
      ? config.bundles.map((bundle) => {
          // Strapi server only needs CommonJs
          if (bundle.runtime === 'node') {
            delete bundle.import;
          }
          // Strapi admin panel only needs ESM
          if (bundle.runtime === 'web') {
            delete bundle.require;
          }

          return bundle;
        })
      : undefined,
    minify: false,
    preserveModules: true,
    preserveModulesRoot: project,
    sourcemap: false,
  };
};

const updateViteConfig = (config) => {
  return mergeConfig(config, {
    build: {
      lib: {
        formats: ['es'],
      },
      sourcemap: false,
      rollupOptions: {
        output: {
          exports: 'named',
          preserveModules: true,
          preserveModulesRoot: project + '/admin',
          interop: 'default',
        },
      },
    },
  });
};

const build = async () => {
  const packUpConfig = await utils.loadConfig({
    cwd: dir,
    logger,
  });

  if (packUpConfig) {
    await buildPackUp({
      silent: true,
      cwd: dir,
      configFile: false,
      config: updatePackUpConfig(packUpConfig),
    });
  }

  if (existsSync(dir + VITE_CONFIG_PATH)) {
    const { config: viteConfig } = await loadConfigFromFile({}, dir + VITE_CONFIG_PATH).catch(
      () => ({})
    );

    if (viteConfig) {
      await buildVite({
        silent: true,
        configFile: false,
        root: dir,
        ...updateViteConfig(viteConfig),
        customLogger: logger,
      });
    }
  }
};

build();
