/**
 * Ambiente de PRUEBAS (el VPS): `ng build --configuration pruebas` (npm run build:pruebas).
 *
 * Mismo codigo que produccion; solo cambian estos valores. Pruebas nunca debe tocar los datos de
 * produccion, asi que apunta a SU API y a SU proyecto de Supabase.
 *
 * Supabase: hoy es el proyecto actual. Cuando P2 cree el proyecto de produccion, el actual pasa a ser el de
 * pruebas (no se migran sus datos) y `environment.prod.ts` pasa a las claves del proyecto nuevo.
 */
export const environment = {
  production: true,
  goAgendaApiUrl: 'https://pruebas.api.goagenda.online',
  supabaseUrl: 'https://ghwkiuwcovrmpztamjgz.supabase.co',
  supabaseAnonKey: 'sb_publishable_UYyewNFK6XwIwTjyk6stZA_sfb5KXtX'
};
