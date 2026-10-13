/** 'percentage' calcula el abono como % del precio; 'fixed' usa un monto exacto en pesos. */
export type ServicePaymentType = 'percentage' | 'fixed';

export interface ServiceItem {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  active: boolean;
  offers_home_visit: boolean;
  requires_payment: boolean;
  payment_type: ServicePaymentType | null;
  payment_percentage: number | null;
  /** Monto fijo del abono, en CENTAVOS (igual que amount_in_cents de Wompi). */
  payment_fixed_amount_cents: number | null;
  payment_description: string | null;
}

/** Respuesta cruda de GET /services: la lista viene envuelta bajo la clave "services". */
export interface ServicesListResponse {
  services: ServiceItem[];
}

export interface ServicePaymentFields {
  requires_payment?: boolean;
  payment_type?: ServicePaymentType | null;
  payment_percentage?: number | null;
  payment_fixed_amount_cents?: number | null;
  payment_description?: string | null;
}

export interface ServiceCreate extends ServicePaymentFields {
  business_id: string;
  name: string;
  duration_minutes?: number;
  price?: number;
  offers_home_visit?: boolean;
}

export interface ServiceUpdate extends ServicePaymentFields {
  name?: string;
  duration_minutes?: number;
  price?: number;
  offers_home_visit?: boolean;
}

export interface BusinessSettings {
  name: string;
  phone_number: string | null;
  reminder_hours_before: number;
}

/** Respuesta cruda de GET /business-settings: el negocio viene envuelto bajo la clave "business". */
export interface BusinessSettingsResponse {
  business: BusinessSettings;
}

export interface BusinessInfoUpdate {
  business_id: string;
  name: string;
  phone_number?: string | null;
}

export interface HomeVisitsToggle {
  business_id: string;
  enabled: boolean;
}

export interface ReminderConfigUpdate {
  business_id: string;
  reminder_hours_before: number;
}

export interface OnboardingStepUpdate {
  business_id: string;
  step: number;
}

export interface OnboardingCompleteInput {
  business_id: string;
}

export interface FcmTokenUpdate {
  business_id: string;
  fcm_token: string;
}

export interface DayHour {
  day: string;
  is_open: boolean;
  opening_time: string | null;
  closing_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
}

/** Respuesta cruda de GET /business-hours: la lista viene envuelta bajo la clave "business_hours". */
export interface BusinessHoursListResponse {
  business_hours: DayHour[];
}

export interface DayHourUpdate {
  business_id: string;
  day: string;
  is_open: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
}

export interface AiUsage {
  business_id: string;
  month: string;
  estimated_spend_usd: number;
}

export interface ExcludedChat {
  business_id: string;
  phone_number: string;
}

export interface ExcludedChatCreate {
  business_id: string;
  phone_number: string;
}

export interface ManualAppointmentInput {
  business_id: string;
  employee_id: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  fecha_hora: string;
  address?: string;
  zone?: string;
}

export interface AvailableSlotsParams {
  business_id: string;
  employee_id: string;
  date: string;
  service_id?: string;
}

/** Respuesta de GET /appointments/available-slots: horas libres en formato "HH:mm". */
export interface AvailableSlotsResponse {
  business_id: string;
  employee_id: string;
  date: string;
  duration_minutes: number;
  available_slots: string[];
}

export interface PairingCodeInput {
  business_id: string;
  phone: string;
}

export interface PairingCodeResponse {
  pairing_code: string;
}

export interface BaileysStatus {
  business_id: string;
  connected: boolean;
}

/** Info publica que el widget de chat necesita antes de arrancar. */
export interface ChatConfig {
  business_id: string;
  name: string;
  business_type: string | null;
  enabled: boolean;
  employee_id: string | null;
  employee_name: string | null;
}

export interface CreateSessionResponse {
  session_id: string;
}

export interface ChatMessageInput {
  mensaje: string;
}

/** Opcion de seleccion rapida (boton) que el cliente puede tocar en vez de escribir. */
export interface ChatOption {
  label: string;
  value: string;
}

export interface ChatMessageResponse {
  respuesta: string;
  opciones: ChatOption[] | null;
}

export interface ChatHistoryMessage {
  role: string;
  content: string;
}

/** Respuesta cruda de GET .../messages: los mensajes vienen envueltos bajo la clave "mensajes". */
export interface ChatHistoryResponse {
  session_id: string;
  mensajes: ChatHistoryMessage[];
  /** Opciones de seleccion rapida pendientes del ultimo turno, si aplican (ver agent/graph.py:obtener_historial). */
  opciones?: ChatOption[] | null;
}

export interface BusinessChatReplyInput {
  mensaje: string;
}

export interface QrCardInput {
  business_id: string;
  chat_link: string;
}

// --- Sesion / roles ---------------------------------------------------

export interface Employment {
  employee_id: string;
  business_id: string;
  business_name: string | null;
  business_blocked: boolean | null;
  business_onboarding_completed: boolean;
  business_onboarding_step: number;
  business_home_visits_enabled: boolean;
  name: string | null;
  role: 'owner' | 'staff';
  active: boolean;
}

/** Respuesta cruda de GET /me: bootstrap de sesion (rol, negocios en los que trabaja). */
export interface MeResponse {
  user_id: string;
  is_super_admin: boolean;
  employments: Employment[];
}

// --- Codigos de invitacion ----------------------------------------------

export interface RedeemInput {
  code: string;
}

export interface RedeemResponse {
  business_id: string;
  role: 'admin' | 'employee';
  employee: Employee;
}

export interface EmployeeInvitationCreate {
  employee_name?: string | null;
}

/** Fila cruda de la tabla invitation_codes. */
export interface InvitationCode {
  id: string;
  code: string;
  business_id: string;
  role: 'admin' | 'employee';
  employee_name: string | null;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

/** Respuesta cruda de POST .../invitation-codes: el codigo viene envuelto bajo la clave "invitation_code". */
export interface InvitationCodeResponse {
  invitation_code: InvitationCode;
}

// --- Empleados ------------------------------------------------------------

export interface Employee {
  id: string;
  business_id: string;
  user_id: string;
  name: string | null;
  role: 'owner' | 'staff';
  active: boolean;
}

/** Respuesta cruda de GET /employees: la lista viene envuelta bajo la clave "employees". */
export interface EmployeesListResponse {
  employees: Employee[];
}

export interface EmployeeUpdate {
  name: string;
}

/** Respuesta cruda de PUT /employees/{id}: el empleado viene envuelto bajo la clave "employee". */
export interface EmployeeUpdateResponse {
  employee: Employee;
}

export interface EmployeeDeleteResponse {
  deleted: boolean;
  employee: Employee;
}

export interface EmployeeHour {
  id: string;
  employee_id: string;
  day: string;
  is_open: boolean;
  opening_time: string | null;
  closing_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
}

/** Respuesta cruda de GET /employees/{id}/hours: la lista viene envuelta bajo la clave "employee_hours". */
export interface EmployeeHoursListResponse {
  employee_hours: EmployeeHour[];
}

export interface EmployeeHourUpdate {
  day: string;
  is_open: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
}

/** Respuesta cruda de PUT /employees/{id}/hours: la fila viene envuelta bajo la clave "employee_hour". */
export interface EmployeeHourUpdateResponse {
  employee_hour: EmployeeHour;
}

/** Respuesta cruda de GET /employees/{id}/services: la lista viene envuelta bajo la clave "services". */
export interface EmployeeServicesResponse {
  services: ServiceItem[];
}

export interface EmployeeServicesUpdate {
  service_ids: string[];
}

export interface EmployeeServicesUpdateResponse {
  services: ServiceItem[];
  business_id: string;
}

// --- Super admin ------------------------------------------------------------

export interface AdminBusiness {
  id: string;
  name: string;
  business_type: string | null;
  owner_id: string | null;
  blocked: boolean;
  created_at: string;
}

/** Respuesta cruda de GET /admin/businesses: la lista viene envuelta bajo la clave "businesses". */
export interface AdminBusinessesListResponse {
  businesses: AdminBusiness[];
}

export interface AdminBusinessCreate {
  name: string;
  business_type?: string | null;
}

/** Respuesta cruda de POST /admin/businesses: el negocio viene envuelto bajo la clave "business". */
export interface AdminBusinessCreateResponse {
  business: AdminBusiness;
}

export interface BlockedUpdate {
  blocked: boolean;
}

/** Respuesta cruda de PUT /admin/businesses/{id}/blocked: el negocio viene envuelto bajo la clave "business". */
export interface AdminBusinessResponse {
  business: AdminBusiness;
}

export interface HomeVisitZone {
  id: string;
  business_id: string;
  name: string;
  fee: number;
  active: boolean;
  /** Variantes del nombre (ej. "Poblado" para la zona "El Poblado") que el bot tambien reconoce al ubicar al cliente. */
  aliases: string[];
}

export interface HomeVisitZonesResponse {
  zones: HomeVisitZone[];
}

export interface HomeVisitZoneCreate {
  business_id: string;
  name: string;
  fee: number;
  aliases?: string[];
}

export interface HomeVisitZoneUpdate {
  name?: string;
  fee?: number;
  active?: boolean;
  aliases?: string[];
}

/**
 * Estado de la configuracion de Wompi de un negocio. Nunca incluye las
 * llaves en si (ni siquiera parcialmente): el backend solo expone si esta
 * configurado, en que ambiente, y el resultado de la ultima validacion.
 */
export interface WompiCredentialsStatus {
  configured: boolean;
  id?: string;
  sandbox_mode?: boolean;
  is_configured?: boolean;
  merchant_id?: string | null;
  last_tested_at?: string | null;
  test_result?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WompiCredentialsInput {
  business_id: string;
  public_key: string;
  private_key: string;
  events_key: string;
  sandbox_mode: boolean;
}

export interface WompiValidateResponse {
  valid: boolean;
  message: string;
}

export type WompiPaymentRequestStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

/**
 * Datos de la cita que se agendara automaticamente cuando se confirme el
 * pago (servicios con abono: la cita no existe todavia mientras
 * status='pending'). Null una vez appointment_id ya esta lleno.
 */
export interface WompiPendingAppointment {
  client_name: string;
  service_name: string;
  scheduled_at: string;
}

/** Una solicitud de abono generada por el bot al agendar un servicio que lo requiere. */
export interface WompiPaymentRequest {
  id: string;
  business_id: string;
  service_id: string | null;
  appointment_id: string | null;
  pending_appointment: WompiPendingAppointment | null;
  session_id: string | null;
  client_phone: string | null;
  amount_in_cents: number;
  description: string | null;
  status: WompiPaymentRequestStatus;
  checkout_url: string;
  wompi_transaction_id: string | null;
  wompi_transaction_status: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  /** Viene del join a services(name) que hace el backend; null si el servicio ya no existe. */
  services: { name: string } | null;
}

export interface WompiPaymentRequestsResponse {
  payment_requests: WompiPaymentRequest[];
}

export interface WompiPaymentRequestCheckResponse {
  solicitud: WompiPaymentRequest;
  mensaje: string;
}


// ---------------------------------------------------------------------
// Centro de metricas y analitica (solo super admin) - ver backend:
// docs/METRICAS_ANALITICA.md. Los porcentajes y tasas llegan en null
// cuando no son calculables (denominador 0): se muestran como "—".
// ---------------------------------------------------------------------

export type MetricsGroupBy = 'day' | 'week' | 'month';
export type MetricsOrigin = 'ai' | 'manual' | 'web' | 'unknown';
export type MetricsBusinessState = 'activo' | 'inactivo' | 'sin_uso';

export interface MetricsParams {
  desde?: string;
  hasta?: string;
  group_by?: MetricsGroupBy;
  comparar?: boolean;
  inactividad_dias?: number;
  refrescar?: boolean;
}

export interface MetricsAlert {
  tipo: string;
  severidad: 'alta' | 'media' | 'baja';
  mensaje: string;
  recomendacion: string;
  business_id?: string;
  nombre?: string;
}

export interface MetricsEvolutionPoint {
  periodo: string;
  total: number;
  ia: number;
  manual: number;
}

export interface MetricsComparisonItem {
  actual: number | null;
  anterior: number | null;
  variacion: number | null;
  variacion_pct: number | null;
}

export interface MetricsBusinessRow {
  business_id: string;
  nombre: string | null;
  registrado_en: string | null;
  bloqueado: boolean;
  onboarding_completado: boolean;
  estado: MetricsBusinessState;
  ultima_actividad: string | null;
  configuracion: { servicios_activos: number; tiene_horario: boolean };
  usa_ia: boolean;
  citas_en_periodo: number;
  citas_ia_en_periodo: number;
  citas_manuales_en_periodo: number;
  porcentaje_citas_ia: number | null;
  tasa_cancelacion: number | null;
  conversion: number | null;
  costo_ia_usd: number;
  dias_hasta_primera_cita: number | null;
  citas_por_semana: number[];
  alertas: MetricsAlert[];
}

export interface MetricsAdoption {
  negocios_registrados: number;
  negocios_activos: number;
  negocios_inactivos: number;
  negocios_sin_uso: number;
  porcentaje_activos: number | null;
  con_servicios: number;
  con_horario: number;
  usan_ia: number;
  solo_agendamiento_manual: number;
  dias_hasta_primera_cita: { mediana: number | null; negocios_medidos: number };
  dejaron_de_usar: number;
  inactividad_dias: number;
}

export interface MetricsResponse {
  periodo: { desde: string; hasta: string; anterior: { desde: string; hasta: string } | null; agrupado_por: MetricsGroupBy };
  criterios: Record<string, string>;
  generado_en: string;
  actualizacion_segundos: number;
  cache: boolean;
  tarjetas: { citas_creadas: number; clientes_unicos: number; citas_ia: number; citas_manuales: number };
  clientes: {
    total_registrados: number;
    nuevos_en_periodo: number;
    recurrentes: number;
    sin_volver: { dias: number; total: number };
  };
  citas: {
    total: number;
    por_estado: Record<'pending' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled', number>;
    reprogramadas: number;
    tasa_cancelacion: number | null;
    porcentaje_completadas: number | null;
    pagos_vencidos: number;
    evolucion: MetricsEvolutionPoint[];
  };
  ia: {
    por_origen: Record<MetricsOrigin, { total: number; porcentaje: number | null }>;
    porcentaje_citas_ia: number | null;
    canceladas_por_ia: number;
    reprogramadas_por_ia: number;
    conversaciones: {
      iniciadas: number;
      con_cita: number;
      transferidas_a_humano: number;
      conversion: number | null;
    };
    costo_usd: number;
    costo_por_cita_ia_usd: number | null;
  };
  rendimiento: {
    servicios_mas_agendados: { service_id: string; nombre: string; total: number; porcentaje: number | null }[];
    citas_por_dia_semana: { dia: string; total: number }[];
    citas_por_hora: { hora: number; total: number }[];
    domicilios: { total: number; porcentaje: number | null };
    ingresos_estimados: { completadas: number; por_realizar: number; recargos_domicilio: number };
  };
  comparacion?: Record<
    'citas_creadas' | 'clientes_unicos' | 'citas_ia' | 'citas_manuales' | 'tasa_cancelacion' | 'conversion' | 'costo_ia_usd',
    MetricsComparisonItem
  >;
  /** Solo en el panel global. */
  adopcion?: MetricsAdoption;
  negocios?: MetricsBusinessRow[];
  alertas?: MetricsAlert[];
  /** Solo en el panel individual. */
  negocio?: MetricsBusinessRow;
}
