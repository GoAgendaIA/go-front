/**
 * Ambiente de PRUEBAS (el VPS): `ng build --configuration pruebas` (npm run build:pruebas).
 *
 * Mismo codigo que produccion; solo cambian estos valores. Pruebas nunca debe tocar los datos de
 * produccion, asi que apunta a SU API y a SU proyecto de Supabase.
 * La API va en `api-pruebas` (un solo nivel): el certificado gratis de Cloudflare no cubre `pruebas.api.` (dos niveles).
 *
 * Supabase: proyecto propio de pruebas (esquema clonado del de produccion, sin datos de clientes). La clave es la
 * publicable (publica por diseno, igual que en environment.prod.ts); la secreta vive solo en el .env del servidor.
 */
export const environment = {
  production: true,
  goAgendaApiUrl: 'https://api-pruebas.goagenda.online',
  supabaseUrl: 'https://mivhmjztunqgawdwoyyb.supabase.co',
  supabaseAnonKey: 'sb_publishable_uNLsfW5Tybhq8OMNLwwVUg_5LGt0z-L'
};
