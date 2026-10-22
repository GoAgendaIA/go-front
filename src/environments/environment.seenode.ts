/**
 * Ambiente de PRODUCCION sobre las URL provisionales de Seenode (`*.seenode.app`): `ng build --configuration seenode`.
 *
 * Mismo Supabase que produccion; solo cambia la API, que apunta al servicio de Seenode. Sirve para verificar P5 antes del
 * corte de DNS (P6). Al mover el dominio, el sitio de Seenode vuelve a compilarse con `production`.
 */
export const environment = {
  production: true,
  goAgendaApiUrl: 'https://goagenda-backend.seenode.app',
  supabaseUrl: 'https://ghwkiuwcovrmpztamjgz.supabase.co',
  supabaseAnonKey: 'sb_publishable_UYyewNFK6XwIwTjyk6stZA_sfb5KXtX'
};
