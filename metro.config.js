// Configuración de Metro con Uniwind (ADR-010).
// withUniwindConfig debe ser el envoltorio más externo.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Garantizar que @firebase/app resuelva siempre a una única instancia
// evitando que dependencias anidadas carguen duplicados ("Component auth has not been registered yet")
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@firebase/app') {
    return context.resolveRequest(
      context,
      path.resolve(__dirname, 'node_modules/@firebase/app'),
      platform
    );
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  // Ruta relativa a la raíz del proyecto (no absoluta).
  cssEntryFile: './src/global.css',
  // Archivo de tipos que Uniwind genera solo al iniciar Metro.
  dtsFile: './src/uniwind-types.d.ts',
});
