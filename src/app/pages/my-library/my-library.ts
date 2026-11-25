import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { RatingModule } from 'primeng/rating';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

// Servicios y Modelos
import { UserGame, GameStatus, GAME_STATUS_LABELS } from '../../models/user-game.model';
import { UserGamesService } from '../../services/user-games';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-my-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeyDown($event)'
  },
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabsModule,
    ButtonModule,
    SelectModule,
    RatingModule,
    ProgressSpinnerModule,
    ToastModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './my-library.html',
  styleUrl: './my-library.css'
})
export class MyLibraryComponent implements OnInit {
  private userGamesService = inject(UserGamesService);
  public authService = inject(AuthService);
  private messageService = inject(MessageService);

  @ViewChild('wheelCanvas') wheelCanvasRef!: ElementRef<HTMLCanvasElement>;

  library = signal<UserGame[]>([]);
  loading = signal<boolean>(true);
  showXpModal = signal<boolean>(false);

  // ── Spin Wheel ────────────────────────────────────────────────────────────
  showWheelModal = signal<boolean>(false);
  wheelFilter = signal<'all' | 'playing' | 'completed' | 'plan_to_play' | 'on_hold' | 'dropped'>('all');
  wheelSpinning = signal<boolean>(false);
  wheelWinner = signal<UserGame | null>(null);
  sfxEnabled = signal<boolean>(true);

  readonly wheelFilterOptions: { v: 'all' | 'playing' | 'completed' | 'plan_to_play' | 'on_hold' | 'dropped'; l: string }[] = [
    { v: 'all', l: 'Todos' },
    { v: 'plan_to_play', l: 'Por Jugar' },
    { v: 'playing', l: 'Jugando' },
    { v: 'on_hold', l: 'En Espera' },
    { v: 'completed', l: 'Completados' },
    { v: 'dropped', l: 'Abandonados' }
  ];

  private readonly WHEEL_MAX = 20;
  private readonly SEGMENT_STYLES = [
    { bg: '#26203a', fg: '#e9ddff' },
    { bg: '#1c2635', fg: '#acedff' },
    { bg: '#2d2218', fg: '#ffddb8' },
    { bg: '#241e33', fg: '#d0bcff' },
    { bg: '#331c23', fg: '#ffb4ab' },
    { bg: '#231a30', fg: '#d0bcff' },
    { bg: '#18272e', fg: '#4cd7f6' },
    { bg: '#281e28', fg: '#e9ddff' },
    { bg: '#2e251a', fg: '#ffddb8' },
    { bg: '#1b2533', fg: '#4cd7f6' }
  ];
  private wheelAngle = 0;
  private rafId: number | null = null;
  private lastTickSegment = -1;

  wheelGames = computed(() => {
    const filter = this.wheelFilter();
    const pool = filter === 'all'
      ? this.library()
      : this.library().filter(g => g.status === filter);
    // Shuffle and limit to 20
    return [...pool].sort(() => Math.random() - 0.5).slice(0, this.WHEEL_MAX);
  });

  wheelFilterLabel = computed(() => {
    const labels: Record<string, string> = {
      all: 'Todos',
      playing: 'Jugando',
      completed: 'Completados',
      plan_to_play: 'Por Jugar',
      on_hold: 'En Espera',
      dropped: 'Abandonados'
    };
    return labels[this.wheelFilter()];
  });
  // ─────────────────────────────────────────────────────────────────────────

  // Opciones para cambiar estado directamente desde la tarjeta
  statusOptions = [
    { label: GAME_STATUS_LABELS.playing, value: 'playing' },
    { label: GAME_STATUS_LABELS.completed, value: 'completed' },
    { label: GAME_STATUS_LABELS.on_hold, value: 'on_hold' },
    { label: GAME_STATUS_LABELS.dropped, value: 'dropped' },
    { label: GAME_STATUS_LABELS.plan_to_play, value: 'plan_to_play' }
  ];

  // Perfil del Archivista (Fusionado con perfil)
  currentUser = this.authService.currentUser;

  username = computed(() => {
    const user = this.currentUser();
    return user?.user_metadata?.['username'] || user?.email?.split('@')[0] || 'Archivist';
  });

  userInitial = computed(() => {
    return this.username().charAt(0).toUpperCase();
  });

  // Métricas computadas de la biblioteca
  totalGames = computed(() => this.library().length);
  playingGames = computed(() => this.library().filter(g => g.status === 'playing'));
  completedGames = computed(() => this.library().filter(g => g.status === 'completed'));
  onHoldGames = computed(() => this.library().filter(g => g.status === 'on_hold'));
  droppedGames = computed(() => this.library().filter(g => g.status === 'dropped'));
  planToPlayGames = computed(() => this.library().filter(g => g.status === 'plan_to_play'));

  completionRatio = computed(() => {
    const total = this.totalGames();
    if (!total) return 0;
    return Math.round((this.completedGames().length / total) * 100);
  });

  estimatedHours = computed(() => {
    return (this.completedGames().length * 28) + (this.playingGames().length * 14) + (this.onHoldGames().length * 8);
  });

  // --- Sistema de XP y Gamificación de QuestLog ---
  // Criterios:
  // 1. Cada juego añadido a la biblioteca: +100 XP (Preservación)
  // 2. Cada juego completado: +400 XP (Victoria Mayor)
  // 3. Cada juego en curso: +150 XP (Compromiso Activo)
  // 4. Cada juego valorado con nota personal: +50 XP (Aporte de Archivo)
  totalXp = computed(() => {
    const list = this.library();
    let xp = 0;
    for (const g of list) {
      xp += 100; // Preservar
      if (g.status === 'completed') xp += 400; // Completado
      if (g.status === 'playing') xp += 150; // Jugando
      if (g.user_rating) xp += 50; // Calificado
    }
    return xp;
  });

  level = computed(() => {
    const xp = this.totalXp();
    return Math.floor(xp / 1000) + 1;
  });

  xpProgress = computed(() => {
    const xp = this.totalXp();
    const inLevel = xp % 1000;
    return {
      current: inLevel,
      max: 1000,
      percent: Math.min(100, Math.round((inLevel / 1000) * 100))
    };
  });

  rankTitle = computed(() => {
    const lvl = this.level();
    if (lvl <= 5) return 'Novice Collector';
    if (lvl <= 15) return 'Archive Seeker';
    if (lvl <= 30) return 'Retro Vanguard';
    if (lvl <= 50) return 'Chrono Archivist';
    return 'Archivist Prime';
  });

  ngOnInit(): void {
    this.loadLibrary();
  }

  async loadLibrary(): Promise<void> {
    this.loading.set(true);
    try {
      const games = await this.userGamesService.getUserLibrary();
      this.library.set(games);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al cargar biblioteca',
        detail: error.message || 'No se pudieron recuperar tus videojuegos'
      });
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Actualiza el estado de un juego directamente desde la biblioteca
   */
  async onStatusChange(game: UserGame, newStatus: GameStatus): Promise<void> {
    try {
      await this.userGamesService.updateStatus(game.game_id, newStatus);

      this.library.update(current =>
        current.map(g => g.game_id === game.game_id ? { ...g, status: newStatus } : g)
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Estado Actualizado',
        detail: `Cambiado a ${GAME_STATUS_LABELS[newStatus]}`
      });
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  /**
   * Actualiza la valoración del juego (escala 1-5 a 1-10)
   */
  async onRatingChange(game: UserGame, newStars: number | null): Promise<void> {
    const rating10 = newStars ? newStars * 2 : null;
    try {
      await this.userGamesService.updateRating(game.game_id, rating10);
      this.library.update(current =>
        current.map(g => g.game_id === game.game_id ? { ...g, user_rating: rating10 } : g)
      );
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  /**
   * Elimina un juego de la biblioteca
   */
  async removeGame(gameId: number, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    try {
      await this.userGamesService.removeGame(gameId);
      this.library.update(current => current.filter(g => g.game_id !== gameId));
      this.messageService.add({
        severity: 'info',
        summary: 'Juego Eliminado',
        detail: 'El título fue quitado de tu colección'
      });
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  getStars(rating: number | null | undefined): number {
    return rating ? Math.round(rating / 2) : 0;
  }

  toggleXpModal(): void {
    this.showXpModal.update(v => !v);
  }

  onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.showWheelModal()) { this.closeWheelModal(); return; }
      if (this.showXpModal()) { this.toggleXpModal(); return; }
    }
    if (!this.showWheelModal()) return;
    if (event.code === 'Space' || event.key === 'r' || event.key === 'R') {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      event.preventDefault();
      if (!this.wheelSpinning() && this.wheelGames().length >= 2) {
        this.spinWheel();
      }
    }
  }

  toggleSfx(): void {
    this.sfxEnabled.update(v => !v);
  }

  getWheelFilterCount(filter: 'all' | 'playing' | 'completed' | 'plan_to_play' | 'on_hold' | 'dropped'): number {
    if (filter === 'all') return this.library().length;
    return this.library().filter(g => g.status === filter).length;
  }

  getStatusLabel(status: GameStatus): string {
    return GAME_STATUS_LABELS[status] || status;
  }

  async acceptWinnerDestination(winner: UserGame): Promise<void> {
    if (winner.status !== 'playing') {
      await this.onStatusChange(winner, 'playing');
      this.wheelWinner.set({ ...winner, status: 'playing' });
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Sesión Activa',
        detail: `${winner.game_title} ya está marcado como Jugando`
      });
    }
  }

  private playTickSound(): void {
    if (!this.sfxEnabled() || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
      setTimeout(() => ctx.close().catch(() => {}), 60);
    } catch {
      // Ignore audio errors if blocked by browser policy
    }
  }

  // ── Spin Wheel methods ────────────────────────────────────────────────────
  openWheelModal(): void {
    this.wheelWinner.set(null);
    this.wheelAngle = 0;
    this.showWheelModal.set(true);
    // Draw after modal renders
    requestAnimationFrame(() => this.drawWheel(this.wheelAngle));
  }

  closeWheelModal(): void {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.wheelSpinning.set(false);
    this.showWheelModal.set(false);
  }

  setWheelFilter(filter: 'all' | 'playing' | 'completed' | 'plan_to_play' | 'on_hold' | 'dropped'): void {
    this.wheelFilter.set(filter);
    this.wheelWinner.set(null);
    this.wheelAngle = 0;
    requestAnimationFrame(() => this.drawWheel(this.wheelAngle));
  }

  spinWheel(): void {
    const games = this.wheelGames();
    if (games.length < 2 || this.wheelSpinning()) return;

    this.wheelWinner.set(null);
    this.wheelSpinning.set(true);
    this.lastTickSegment = -1;

    const totalSpins = (Math.floor(Math.random() * 5) + 5) * Math.PI * 2;
    const extra = Math.random() * Math.PI * 2;
    const target = this.wheelAngle + totalSpins + extra;
    const duration = 4000 + Math.random() * 1500;
    const start = performance.now();
    const startAngle = this.wheelAngle;
    const segAngle = (Math.PI * 2) / games.length;

    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      this.wheelAngle = startAngle + (target - startAngle) * easeOut(progress);
      this.drawWheel(this.wheelAngle);

      const normalized = ((Math.PI * 1.5) - this.wheelAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const currentSeg = Math.floor(normalized / segAngle) % games.length;
      if (currentSeg !== this.lastTickSegment) {
        this.lastTickSegment = currentSeg;
        this.playTickSound();
      }

      if (progress < 1) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.wheelAngle = this.wheelAngle % (Math.PI * 2);
        this.wheelSpinning.set(false);
        this.rafId = null;
        this.resolveWinner();
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }

  private resolveWinner(): void {
    const games = this.wheelGames();
    if (!games.length) return;

    const segmentAngle = (Math.PI * 2) / games.length;
    // Pointer is at top (270° = 3π/2). Normalize angle to find which segment is under pointer.
    const normalized = ((Math.PI * 1.5) - this.wheelAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const index = Math.floor(normalized / segmentAngle) % games.length;
    this.wheelWinner.set(games[index]);
  }

  private drawWheel(angle: number): void {
    const canvas = this.wheelCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const games = this.wheelGames();
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(cx, cy) - 8;
    const n = games.length;

    ctx.clearRect(0, 0, W, H);

    if (n === 0) {
      ctx.fillStyle = '#1a2235';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8899aa';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sin juegos en esta categoría', cx, cy);
      return;
    }

    const segAngle = (Math.PI * 2) / n;

    for (let i = 0; i < n; i++) {
      const start = angle + i * segAngle;
      const end = start + segAngle;
      const style = this.SEGMENT_STYLES[i % this.SEGMENT_STYLES.length];

      // Segment
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = style.bg;
      ctx.fill();
      ctx.strokeStyle = '#31353c';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      const mid = start + segAngle / 2;
      const labelR = radius * 0.66;
      const lx = cx + Math.cos(mid) * labelR;
      const ly = cy + Math.sin(mid) * labelR;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(mid + Math.PI / 2);
      ctx.fillStyle = style.fg;
      ctx.font = `700 ${Math.max(9, Math.min(12, 280 / n))}px 'Space Grotesk', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const name = games[i].game_title;
      const maxLen = n > 10 ? 10 : 15;
      ctx.fillText(name.length > maxLen ? name.substring(0, maxLen) + '…' : name, 0, 0);
      ctx.restore();
    }

    // Concentric aesthetic partition rings (matching Stitch)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#31353c';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.61, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(208, 188, 255, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  // ─────────────────────────────────────────────────────────────────────────
}