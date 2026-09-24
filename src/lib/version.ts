// Definida pelo Vite no build (vite.config.ts). Em desenvolvimento vale "dev".
declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
