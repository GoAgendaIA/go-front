import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError, firstValueFrom, timeout } from 'rxjs';
import { ChatHistoryResponse, ChatMessageResponse, ChatOption } from '../../core/models/goagenda.models';
import { GoagendaApiService } from '../../core/services/goagenda-api.service';
import { LucideIconComponent } from '../../shared/components/lucide-icon/lucide-icon.component';
import { userMessageForSendError } from './send-error-message';

const SESSION_KEY_PREFIX = 'goagenda_chat_session_';
const SOUND_PREF_KEY = 'goagenda_chat_sound_enabled';
const TEXTAREA_MAX_HEIGHT = 120;
const POLL_INTERVAL_MS = 5000;
// Por debajo del limite de 100s del tunel de Cloudflare: un turno normal
// del agente tarda unos segundos; si se queda colgado (ej. el celular
// cambio de red) es mejor cortar y reintentar que bloquear el chat.
const SEND_TIMEOUT_MS = 75_000;
const SEND_RETRY_DELAY_MS = 1500;

/** Id unico por mensaje del cliente, para que el envio sea idempotente (ver sendWithRetry). */
function newClientMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Navegadores viejos sin randomUUID: suficiente para distinguir mensajes de una misma sesion.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Sin red (status 0), errores 5xx (backend o tunel de Cloudflare) y timeouts: vale la pena reintentar. */
function isTransientError(error: unknown): boolean {
  if (error instanceof TimeoutError) {
    return true;
  }
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
}

function describeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return `HTTP ${error.status} ${error.statusText || ''}`.trim();
  }
  if (error instanceof TimeoutError) {
    return `timeout de ${SEND_TIMEOUT_MS / 1000}s`;
  }
  return String(error);
}

interface ChatBubble {
  role: 'user' | 'assistant';
  content: string;
  options?: ChatOption[] | null;
}

@Component({
  selector: 'app-chat-page',
  imports: [LucideIconComponent],
  templateUrl: './chat.page.html',
  styleUrl: './chat.page.css'
})
export class ChatPageComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private readonly messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('composerInput') private readonly composerInput?: ElementRef<HTMLTextAreaElement>;

  readonly businessName = signal('');
  readonly employeeName = signal('');
  readonly enabled = signal(true);
  readonly isLoadingConfig = signal(true);
  readonly notFound = signal(false);
  readonly messages = signal<ChatBubble[]>([]);
  readonly draft = signal('');
  readonly isSending = signal(false);
  readonly errorMessage = signal('');
  readonly soundEnabled = signal(localStorage.getItem(SOUND_PREF_KEY) !== 'false');

  readonly businessInitial = computed(() => (this.businessName().trim().charAt(0) || 'G').toUpperCase());
  readonly canSend = computed(() => this.enabled() && !this.isSending() && this.draft().trim().length > 0);

  // Solo se ofrecen botones de seleccion rapida en el ultimo mensaje del asistente:
  // una vez el cliente sigue la conversacion, opciones de un turno anterior ya no aplican.
  readonly latestOptions = computed(() => {
    const last = this.messages().at(-1);
    return last?.role === 'assistant' && !this.isSending() ? (last.options ?? null) : null;
  });

  private businessId = '';
  private employeeId = '';
  private sessionId = '';
  /** Ultimo mensaje que no se pudo enviar: si el cliente lo reenvia igual, se reusa su id. */
  private failedMessage: { text: string; clientMessageId: string } | null = null;
  /** El historial no cargo al abrir el chat (error temporal): el polling lo trae y quita el aviso. */
  private historyLoadFailed = false;
  private audioContext?: AudioContext;
  private readonly pendingScrollTimeouts: ReturnType<typeof setTimeout>[] = [];
  private pollTimer?: ReturnType<typeof setInterval>;
  private readonly handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.visibilityState === 'visible') {
      this.resumePolling();
    } else {
      this.pausePolling();
    }
  };

  /**
   * Al abrirse el teclado en movil, algunos navegadores no achican el
   * viewport de layout (solo el visual) — un `100dvh` fijo entonces deja
   * el composer y parte de los mensajes tapados por el teclado (bug
   * reportado por QA). Sincronizamos manualmente la altura real visible
   * via visualViewport, que si refleja el espacio que el teclado dejo
   * libre, y forzamos un reencuadre del scroll cuando cambia.
   */
  private readonly handleViewportResize = (): void => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const height = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--chat-vh', `${height}px`);
    this.queueScroll();
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly apiService: GoagendaApiService
  ) {}

  ngOnInit(): void {
    this.businessId = this.route.snapshot.paramMap.get('businessId') ?? '';
    this.employeeId = this.route.snapshot.paramMap.get('employeeId') ?? '';

    if (!this.businessId) {
      this.notFound.set(true);
      this.isLoadingConfig.set(false);
      return;
    }

    void this.bootstrap();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      if (document.visibilityState === 'visible') {
        this.resumePolling();
      }
    }

    this.handleViewportResize();
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.handleViewportResize);
      window.visualViewport.addEventListener('scroll', this.handleViewportResize);
    }
  }

  ngOnDestroy(): void {
    this.pausePolling();
    this.pendingScrollTimeouts.forEach((id) => clearTimeout(id));

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.handleViewportResize);
      window.visualViewport.removeEventListener('scroll', this.handleViewportResize);
    }
  }

  onDraftInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.draft.set(textarea.value);
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    localStorage.setItem(SOUND_PREF_KEY, String(next));
  }

  formatMessage(content: string): string {
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const linked = escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return linked.replace(/\*([^\n*]+)\*/g, '<strong>$1</strong>');
  }

  async sendMessage(): Promise<void> {
    const text = this.draft().trim();

    if (!text || this.isSending() || !this.sessionId) {
      return;
    }

    // Si el cliente reenvia el mismo texto que fallo, se reutiliza su id: si
    // el backend alcanzo a procesarlo (y solo se perdio la respuesta en el
    // camino), devuelve esa respuesta en vez de procesarlo dos veces.
    const clientMessageId =
      this.failedMessage?.text === text ? this.failedMessage.clientMessageId : newClientMessageId();
    const bubble: ChatBubble = { role: 'user', content: text };

    this.messages.update((current) => [...current, bubble]);
    this.draft.set('');
    this.errorMessage.set('');
    this.isSending.set(true);
    this.resetComposerHeight();
    this.queueScroll();

    try {
      const response = await this.sendWithRetry(text, clientMessageId);
      this.failedMessage = null;
      this.messages.update((current) => [
        ...current,
        { role: 'assistant', content: response.respuesta, options: response.opciones }
      ]);
      this.playNotificationSound();
    } catch (error) {
      // Antes este catch se tragaba el error sin dejar rastro y no habia
      // forma de saber por que fallaba; ahora queda en la consola.
      console.error('[chat] no se pudo enviar el mensaje', describeError(error));
      this.failedMessage = { text, clientMessageId };
      // Se devuelve el texto al cuadro de escritura (en vez de dejar una
      // burbuja que parece enviada pero no llego) para reenviarlo con un toque.
      this.messages.update((current) => current.filter((item) => item !== bubble));
      this.draft.set(text);
      this.errorMessage.set(userMessageForSendError(error));
    } finally {
      this.isSending.set(false);
      this.queueScroll();
    }
  }

  /**
   * Un reintento automatico ante fallas transitorias (sin red, 5xx del
   * servidor o del tunel de Cloudflare, timeout): la mayoria se resuelven
   * solas en segundos (ej. un reinicio del backend por un deploy). Los 4xx
   * no se reintentan porque repetir la misma peticion daria el mismo error.
   * Es seguro reintentar porque el envio es idempotente por clientMessageId.
   */
  private async sendWithRetry(text: string, clientMessageId: string): Promise<ChatMessageResponse> {
    const enviar = () =>
      firstValueFrom(
        this.apiService
          .sendChatMessage(this.businessId, this.sessionId, text, this.employeeId || undefined, clientMessageId)
          .pipe(timeout(SEND_TIMEOUT_MS))
      );

    try {
      return await enviar();
    } catch (error) {
      if (!isTransientError(error)) {
        throw error;
      }
      console.warn('[chat] envio fallido, reintentando una vez', describeError(error));
      await new Promise((resolve) => setTimeout(resolve, SEND_RETRY_DELAY_MS));
      return enviar();
    }
  }

  /** Boton de seleccion rapida: manda el valor directamente, como si el cliente lo hubiera escrito. */
  selectOption(value: string): void {
    if (this.isSending()) {
      return;
    }

    this.draft.set(value);
    void this.sendMessage();
  }

  private async bootstrap(): Promise<void> {
    try {
      const config = await firstValueFrom(this.apiService.getChatConfig(this.businessId, this.employeeId || undefined));
      this.businessName.set(config.name);
      this.employeeName.set(config.employee_name ?? '');
      this.enabled.set(config.enabled);
    } catch {
      this.notFound.set(true);
      this.isLoadingConfig.set(false);
      return;
    }

    this.isLoadingConfig.set(false);
    await this.restoreOrCreateSession();
  }

  private async restoreOrCreateSession(): Promise<void> {
    const storageKey = SESSION_KEY_PREFIX + this.businessId + (this.employeeId ? `_${this.employeeId}` : '');
    const storedSessionId = localStorage.getItem(storageKey);

    if (storedSessionId) {
      const cargarHistorial = () =>
        firstValueFrom(this.apiService.getChatHistory(this.businessId, storedSessionId, this.employeeId || undefined));

      try {
        let response: ChatHistoryResponse;
        try {
          response = await cargarHistorial();
        } catch (error) {
          if (!isTransientError(error)) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, SEND_RETRY_DELAY_MS));
          response = await cargarHistorial();
        }

        this.sessionId = storedSessionId;
        this.applyHistory(response);

        if (this.messages().length === 0) {
          this.pushGreeting();
        }

        this.queueScroll();
        return;
      } catch (error) {
        // Antes cualquier falla (incluido un error temporal del servidor)
        // borraba la sesion y creaba una nueva: el cliente perdia toda su
        // conversacion. Solo un 404 significa que la sesion ya no sirve; ante
        // un error temporal se conserva, y el polling (pollForNewMessages)
        // trae el historial en cuanto el servidor vuelva a responder.
        console.error('[chat] no se pudo cargar el historial', describeError(error));
        if (isTransientError(error)) {
          this.sessionId = storedSessionId;
          this.historyLoadFailed = true;
          this.errorMessage.set('No pudimos cargar tu conversacion. Reintentando en unos segundos...');
          return;
        }
        localStorage.removeItem(storageKey);
      }
    }

    try {
      const sessionId = await firstValueFrom(this.apiService.createChatSession(this.businessId, this.employeeId || undefined));
      this.sessionId = sessionId;
      localStorage.setItem(storageKey, sessionId);
      this.pushGreeting();
      this.queueScroll();
    } catch {
      this.errorMessage.set('No se pudo iniciar el chat. Intenta recargar la pagina.');
    }
  }

  private pushGreeting(): void {
    const name = this.businessName() || 'este negocio';
    this.messages.set([
      {
        role: 'assistant',
        content: `Hola, soy el asistente virtual de ${name}. Cuentame que servicio necesitas y te ayudo a agendar tu cita.`
      }
    ]);
  }

  private normalizeRole(role: string): 'user' | 'assistant' {
    return role === 'user' || role === 'human' ? 'user' : 'assistant';
  }

  /**
   * Reconstruye messages() desde una respuesta de historial completa,
   * reenganchando las opciones de seleccion rapida del ultimo turno si el
   * backend las devolvio (ver ChatHistoryResponse.opciones) — sin esto,
   * recargar la sesion (ej. el navegador recarga la pestaña al volver de
   * segundo plano) perdia los botones de hora/servicio/empleado que ya
   * estaban mostrados antes de recargar.
   */
  private applyHistory(response: ChatHistoryResponse): void {
    const bubbles: ChatBubble[] = response.mensajes.map((message) => ({
      role: this.normalizeRole(message.role),
      content: message.content
    }));

    const last = bubbles.at(-1);
    if (last && last.role === 'assistant' && response.opciones) {
      last.options = response.opciones;
    }

    this.messages.set(bubbles);
  }

  /**
   * Consulta cada POLL_INTERVAL_MS si hay mensajes nuevos que el cliente
   * todavia no ve — asi, si el dueño responde manualmente desde el panel
   * (agent/graph.py:enviar_respuesta_humana) mientras esta pestaña sigue
   * abierta, el mensaje llega en unos segundos sin que el cliente tenga
   * que escribir de nuevo. El widget no tiene ningun canal en vivo, asi
   * que esto es deliberadamente un polling simple, no un WebSocket.
   */
  private resumePolling(): void {
    if (this.pollTimer) {
      return;
    }

    this.pollTimer = setInterval(() => void this.pollForNewMessages(), POLL_INTERVAL_MS);
  }

  private pausePolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  private async pollForNewMessages(): Promise<void> {
    if (!this.sessionId || this.isSending()) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.apiService.getChatHistory(this.businessId, this.sessionId, this.employeeId || undefined)
      );

      if (response.mensajes.length > this.messages().length) {
        const nuevos: ChatBubble[] = response.mensajes
          .slice(this.messages().length)
          .map((message) => ({ role: this.normalizeRole(message.role), content: message.content }));

        const last = nuevos.at(-1);
        if (last && last.role === 'assistant' && response.opciones) {
          last.options = response.opciones;
        }

        this.messages.update((current) => [...current, ...nuevos]);

        // Un mensaje que parecio fallar pero que el servidor si alcanzo a
        // procesar (solo se perdio la respuesta) llega por aqui: se limpia
        // el borrador para que el cliente no lo reenvie.
        const failed = this.failedMessage;
        if (failed && nuevos.some((item) => item.role === 'user' && item.content.trim() === failed.text)) {
          this.failedMessage = null;
          if (this.draft().trim() === failed.text) {
            this.draft.set('');
          }
        }

        this.playNotificationSound();
        this.queueScroll();
      }
      // El historial que no se pudo cargar al abrir el chat ya llego: se quita ese aviso.
      if (this.historyLoadFailed) {
        this.historyLoadFailed = false;
        this.errorMessage.set('');
      }
    } catch {
      // Un fallo de polling no debe interrumpir el chat; se reintenta en el siguiente ciclo.
    }
  }

  private resetComposerHeight(): void {
    const textarea = this.composerInput?.nativeElement;

    if (textarea) {
      textarea.style.height = 'auto';
    }
  }

  /**
   * Baja el scroll al fondo del todo. Un solo intento justo despues de
   * actualizar messages() a veces quedaba corto (bug reportado por QA):
   * el navegador reajusta el layout un instante despues (scroll
   * anchoring, iconos SVG, emojis) y el mensaje nuevo terminaba
   * parcialmente oculto. Por eso se reafirma varias veces en una ventana
   * corta en vez de una sola vez; `scroll-behavior: smooth` en .messages
   * (chat.page.css) anima cada reajuste sin saltos bruscos.
   */
  private queueScroll(): void {
    const container = this.messagesContainer?.nativeElement;
    if (!container) {
      return;
    }

    this.pendingScrollTimeouts.forEach((id) => clearTimeout(id));
    this.pendingScrollTimeouts.length = 0;

    const snap = () => {
      container.scrollTop = container.scrollHeight;
    };

    snap();
    requestAnimationFrame(snap);
    [60, 220, 500].forEach((delay) => {
      this.pendingScrollTimeouts.push(setTimeout(snap, delay));
    });
  }

  private playNotificationSound(): void {
    if (!this.soundEnabled()) {
      return;
    }

    try {
      this.audioContext ??= new AudioContext();
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.09);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch {
      // El navegador puede bloquear audio sin interaccion previa; se ignora en silencio.
    }
  }
}
