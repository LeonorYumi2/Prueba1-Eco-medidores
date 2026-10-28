// Navegación por código. Con "typedRoutes" activo, las rutas nuevas no existen en los tipos
// hasta que Expo los regenera; por eso se pasa la ruta como texto.
import { router } from 'expo-router';

export const irA = (ruta: string) => router.push(ruta as never);
export const reemplazarCon = (ruta: string) => router.replace(ruta as never);
export const volver = () => router.back();