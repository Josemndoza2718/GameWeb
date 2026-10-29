import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { MessageService } from 'primeng/api';

// Servicios y Modelos
import { Post, PostType } from '../../models/post.model';
import { Game } from '../../models/rawg.model';
import { PostsService } from '../../services/posts';
import { RawgService } from '../../services/rawg';
import { AuthService } from '../../services/auth';

export interface CuratorLeader {
  rank: string;
  handle: string;
  reputation: string;
  avatar: string;
  level: number;
}

export interface DialecticDebateItem {
  id: string;
  authorHandle: string;
  authorLevel: number;
  authorTitle: string;
  authorAvatar: string;
  timeAgo: string;
  disputeTag: string;
  isHot?: boolean;
  gameId: number;
  gameTitle: string;
  gameCover: string;
  tags: string[];
  title: string;
  summary: string;
  upvotes: number;
  argumentsCount: number;
  consensusPercent?: number;
  consensusLabel?: string;
  heresyIndex?: string;
}

@Component({
  selector: 'app-community',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ToastModule,
    ProgressSpinnerModule,
    AutoCompleteModule
  ],
  providers: [MessageService],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
  templateUrl: './community.html',
  styleUrl: './community.css'
})
export class CommunityComponent implements OnInit {
  private postsService = inject(PostsService);
  private rawgService = inject(RawgService);
  public authService = inject(AuthService);
  public messageService = inject(MessageService);

  // Estados de datos
  posts = signal<Post[]>([]);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);

  // Filtros principales de vista
  selectedFilter = signal<string>('trending');
  selectedTag = signal<string>('Todos');

  // Interacción de Upvotes locales
  votedPosts = signal<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Duelo Argumental de la Semana (Estado Interactivo)
  // ---------------------------------------------------------------------------
  duelVotesA = signal<number>(1240);
  duelVotesB = signal<number>(582);
  userDuelVote = signal<'A' | 'B' | null>(null);

  totalDuelVotes = computed(() => this.duelVotesA() + this.duelVotesB());
  percentA = computed(() => Math.round((this.duelVotesA() / this.totalDuelVotes()) * 100));
  percentB = computed(() => 100 - this.percentA());

  // ---------------------------------------------------------------------------
  // Curadores y Widgets
  // ---------------------------------------------------------------------------
  curators: CuratorLeader[] = [
    {
      rank: '1º',
      handle: 'Valen_Mage',
      reputation: '99.2% Reputación Canónica',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1BLGNekpWF66MxWt5f5k2-gxocAPlkf7QlDtUl-rVuOQLo38H6uYZT_UTjyBgFhvawkfvGfLOU93Oq23Er7Baqtp9ahQEVqZSNZkXMDODKEPK67k_OruPOrE8cVTP2OgeF5TJlx-f3mTKw7taidFIIf9jJ5FAWaoWl0NE0HAN3PJ9oCS2zRTZcdpNOXJufANN4MDFyq6rOXYqnRpDc4HoQj373CAZmzbUOI2a5TCbN_RJktevLnA',
      level: 58
    },
    {
      rank: '2º',
      handle: 'RetroKitsune',
      reputation: '96.8% Reputación Canónica',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8X0Mm_Wpw3gkyUrZnKMiCnoZSxZIPMLW0CtZ6ZCoh6V7Ccav1Io6NpiqquXRB1tCo0WZVBOFhMCylsMGtpkl3YC0VfvQmKthd0kIraBU9TSkaQzVAmpPKo_UJ6SwoksjUOlf1OnXwmS7sQOeQQ45wsXJDLXqMP7HSxlF9opcXOuClZNpWlt-2DjP8R8-cPjp-UmY2Rn8rsi1OCcl9kTkXfwNrx1L8HpnJKGYUESGkwb95ed-rV08',
      level: 39
    },
    {
      rank: '3º',
      handle: 'LoreWeaver',
      reputation: '94.5% Reputación Canónica',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6Z-DXvlvxwsyjChe_jmDRXqr2JpT-ZaK1n-EA5XlwseLLK8TTvbRkvnR_tW3lCEY81o2CAA-mwa7jSXqY1cce6HdtptRMlpOnjhbecAa5juBLfTFDLIDRSaRZlCTsmLRjKnQVJWJEhGZhVkvyg-Acjxiaqyl-eQhS6Vh7WkAZku4-k15rEWXzBNQvsHP-sXeipWFwfjrQmgYAdEd8O3CUpgVU7KJ6g3UGQ_tgtukCrz1qT-Mb7Fo',
      level: 48
    }
  ];

  followedCurators = signal<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Debates Destacados del Ágora
  // ---------------------------------------------------------------------------
  seedDebates = signal<DialecticDebateItem[]>([
    {
      id: 'd1',
      authorHandle: 'RetroKitsune',
      authorLevel: 39,
      authorTitle: 'Archivista de Diseño de Niveles',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAox8wQehcAnQFDar8RAxiySQCvW0HcV6GFWyRkUkYcc8D_CkLvt3VxchIUfKgtFEjUiHCgajpu7U_8MLY7m0P9N_ZBDJb5uZs38dBIZxagxiWCNxfwnzVY4Nn79k9ak0lsRW0RUpa0UtUTQXFVoix-oOObD-VCCBLYEnhLxMxm5xKPw0UXvn8tC4mvAKG4o-aYyKWT8gXOkKTGChkkRLXH8Xn_QgFFsxNrjP_4hFSf-Mz0PJyRxZE',
      timeAgo: 'Hace 2 horas',
      disputeTag: 'Disputa: Tier S vs Tier A',
      gameId: 422,
      gameTitle: 'Elden Ring',
      gameCover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCz37o6unPk3sYP4vxesmZCiiZd_a_sOqGj2SFhZuv7jramS8qHoV9kcKCOXwgbAA3wJTBZ7xT-CBBvqFCjBiOudxItz60gXDzpb-1YjSqjMKGmnbGhg7ViA8JhgIsvgqcf4jd91jU9uaUIeefTEYirv1ikvr2wcioj0Og0a35h3-E5tDb5LakJl_YtUzgxv2R1Abm7cHNKVx7WHR6twIt6I8DIBBig_Q9_0h6wUlZ57NbBH0cpFB4',
      tags: ['#FromSoftware', '#LevelDesign'],
      title: 'Elden Ring vs. Dark Souls 1: ¿La escala de mundo abierto diluyó el diseño de niveles magistral?',
      summary: 'La interconectividad vertical de Lordran en DS1 sigue siendo insuperable. En Elden Ring, aunque Stormveil y Leyndell son titánicas, la repetición de catacumbas genéricas abarata la sensación de descubrimiento puro consolidada en 2011. ¿Sigue mereciendo Tier S supremo?',
      upvotes: 342,
      argumentsCount: 89
    },
    {
      id: 'd2',
      authorHandle: 'ChronoMaster',
      authorLevel: 64,
      authorTitle: 'Gran Archivista SNES',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBpaiUgCb7XB5IRu7ZvOhuGJbJo8Bz5rT7QZ4Z4hACVp6bN9oMlNRpjQf8kU3evlSXgXsIuN2xKq0avzFTGxBQjmCBI65FgjE9wMKnW-4m0jt2SSqZs5lvzd6wIu-aFzJEjsCWsSzDTQXbFpZuNw7tS7z1dLlRxET1aB_P8Zm22WZNvK2YGZPTF5pE7YSNhl81trFhADcyJQTl9FlzXiqiv2KIfkOriOh0GjY5FnF9XHBDKV2b6eMM',
      timeAgo: 'Hace 5 horas',
      disputeTag: 'Veredicto Canónico Sólido',
      gameId: 24,
      gameTitle: 'Chrono Trigger',
      gameCover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYdj1O6RZcZ_Sr0PIHjCT5H7r6ybkyVwJ-8lqnaX-lJrMj8pWpgEctB9v1X5Z0cXHJrQynwy_roEuFELNUn-g_T1tjosSU4zwwqjE2_twe0DZIt9Osltyu3HrbUP1hxXXXvmAxiYSOTfAlumKQ4jsBwzHRYPJ3aumyiO4orACTZHC3WlNqCHntIPJgXNXGaoiviCxEZ4DyYFi2LSkmYvBiZDa3fgZjrMuwZlMNozQVJERZfzhNHxI',
      tags: ['#JRPG', '#RetroPreservation'],
      title: 'Canonización de Chrono Trigger: ¿Es el JRPG perfecto indiscutible o la nostalgia ciega las mecánicas?',
      summary: 'Ritmo sin relleno, banda sonora de Yasunori Mitsuda y Nobuo Uematsu, cero encuentros aleatorios y múltiples finales con New Game+. Con 450 votos en el tribunal, el 94% ratifica el Tier S indiscutible. ¿Queda algún argumento revisionista que se sostenga?',
      upvotes: 612,
      argumentsCount: 142,
      consensusPercent: 94,
      consensusLabel: '94% Consenso Tier S+ (450 Jurados)',
      heresyIndex: '6%'
    },
    {
      id: 'd3',
      authorHandle: 'ViviBlackMage',
      authorLevel: 51,
      authorTitle: 'Archivista Existencialista',
      authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBovILTwWC0LFd964I-cc3IbtraZ5mEg1ri5js8UUaueBRzxhOZmst_q-5YK8YQ3XFWqk_-unvflgMnjS_SRYd3bcwfQtbkIKDTpByNPQdYZgZeErdg1YIUvPKPfcyvoaCqtzwhkyLb65ThNxMpsTryvWhZBdzZVxOxyHBFgwCKdPmgf_nY2lLk54zQy-Q2mMoTJlzAYdc1XGu-y4FfHn1wJ4HWylsnoi8yiRJZKJHRVi2O1wwMADQ',
      timeAgo: 'Hace 11 horas',
      disputeTag: 'Herejía Registrada',
      isHot: true,
      gameId: 19,
      gameTitle: 'Final Fantasy IX',
      gameCover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAywrTcpArb3wFCWTGBSVWORqlvV6Ayu2wqSlB1bmjNVi7LFuGoh9AWFxyZw4z6IskK51IHBCDNNoOKFtB8vYRJE09sQhl6ldPlP3-1LnlmrTHTo6OtQ0KQXsqrY94c6Wjfzc2Rft9BP7HqfVPvVn1hoeQqVlzmjOW6Fu9SjM_-ky5gqxVYFmGRufmgiEgQEUk9sNDm6MeK4EsxhJO70k0oHyjsu0dKbh5N5137JqZGUE3Vu3FrkTY',
      tags: ['#FinalFantasy', '#JRPG'],
      title: 'Herejía: Por qué Final Fantasy IX superó a FF VII en envejecimiento estético y narrativa coral',
      summary: 'La dirección artística de corte teatral, los fondos pre-renderizados con proporción anatómica consistente y el dilema ontológico de Kuja y Vivi envejecieron con mucha mayor solidez que los polígonos tempranos de Midgar. ¿Es hora de invertir las posiciones en el Tier S del canon oficial?',
      upvotes: 874,
      argumentsCount: 215
    }
  ]);

  // ---------------------------------------------------------------------------
  // Modal de Creación Dialéctico (Stitch f0a8c239)
  // ---------------------------------------------------------------------------
  isModalOpen = signal<boolean>(false);
  modalMode = signal<'heresy' | 'canonical'>('heresy');

  selectedGame = signal<Game | null>({
    id: 111,
    name: 'Castlevania: Symphony of the Night (1997)',
    background_image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAze35SaFsGC_03cIOZ8_9BLMloB_CSRDHxlFOZAgvwL6_NytPnqbiKShxxP_-VDSltUrsWaLoUxPISCHdATqLaDKSXh_q3j0wfpl1tzJMUYUJfPcvvTIrtN3IHrekD7fPYJMkLfm0ARIH5AYt9FrcXktb7LjeB4i48UHPo5ji5Y8ij6qxBtkrdERSsChSYiIfZAvkOPlq4ZDlcfpwScceLbcf-gOscU_ZbNXArY3JKI8OAfINwas'
  } as Game);

  gameSuggestions = signal<Game[]>([]);
  thesisTitle = signal<string>('El castillo invertido sabotea el balance de progresión, triviliza la dificultad y recicla assets con diseño geométrico tosco.');
  selectedTier = signal<'S' | 'A' | 'B' | 'C' | 'D'>('B');
  enableLiveDuel = signal<boolean>(true);
  argumentContent = signal<string>(`1. Desbalance y Ruptura de Curva:
Una vez que el jugador accede al Castillo Invertido tras el ritual de Richter, las curvas de escalado de defensa de Alucard colapsan completamente contra jefes como Galamoth o Beelzebub.

2. Ergonomía Espacial del Inverted Map:
La geometría de salas originalmente calculada para la gravedad terrestre exige el spamming permanente de Bat Form o Leap Boots, reduciendo el plataformeo rítmico a un mero desplazamiento vertical torpe sin ritmo sonoro coherente.

3. Conclusión de la Herejía:
Symphony of the Night es una obra maestra de atmósfera e influencia estética, pero su segunda mitad evidencia fatiga de desarrollo que el canon de la bóveda se niega a calificar objetivamente.`);
  juryScope = signal<'all' | 'curators' | 'express'>('all');
  notifyDiscord = signal<boolean>(true);

  // Medidor dinámico de rigor argumental (0 - 100%)
  rigorScore = computed(() => {
    const text = this.argumentContent().trim();
    if (text.length < 50) return 25;
    if (text.length < 150) return 55;
    if (text.length < 300) return 78;
    return 94;
  });

  rigorLabel = computed(() => {
    const score = this.rigorScore();
    if (score >= 90) return '94% • Nivel Jurídico Óptimo';
    if (score >= 70) return '78% • Rigor Fundamentado';
    return '55% • Tesis Inicial';
  });

  ngOnInit(): void {
    this.loadPosts();
  }

  async loadPosts(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.postsService.getPosts('all');
      this.posts.set(data);
    } catch {
      // Usar seed posts sin interrumpir si la red offline
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(filterId: string): void {
    this.selectedFilter.set(filterId);
  }

  setTag(tag: string): void {
    this.selectedTag.set(tag);
  }

  voteDuel(posture: 'A' | 'B'): void {
    if (this.userDuelVote() === posture) return;

    if (this.userDuelVote() === 'A') {
      this.duelVotesA.update(v => Math.max(0, v - 1));
    } else if (this.userDuelVote() === 'B') {
      this.duelVotesB.update(v => Math.max(0, v - 1));
    }

    if (posture === 'A') {
      this.duelVotesA.update(v => v + 1);
    } else {
      this.duelVotesB.update(v => v + 1);
    }

    this.userDuelVote.set(posture);
    this.messageService.add({
      severity: 'success',
      summary: 'Voto Registrado (+50 XP)',
      detail: posture === 'A'
        ? 'Has apoyado la Tesis de Perfección Canónica (Tier S).'
        : 'Has respaldado la Crítica de Desbalance Mecánico (Tier B).'
    });
  }

  toggleFollowCurator(handle: string): void {
    this.followedCurators.update(set => {
      const next = new Set(set);
      if (next.has(handle)) {
        next.delete(handle);
      } else {
        next.add(handle);
      }
      return next;
    });

    const isFollowing = this.followedCurators().has(handle);
    this.messageService.add({
      severity: isFollowing ? 'success' : 'info',
      summary: isFollowing ? `Siguiendo a @${handle}` : `Has dejado de seguir a @${handle}`,
      detail: isFollowing ? 'Recibirás sus veredictos y tier lists en tu feed.' : ''
    });
  }

  isCuratorFollowed(handle: string): boolean {
    return this.followedCurators().has(handle);
  }

  upvoteDebate(debateId: string): void {
    const voted = this.votedPosts().has(debateId);
    this.votedPosts.update(set => {
      const next = new Set(set);
      if (voted) next.delete(debateId);
      else next.add(debateId);
      return next;
    });

    this.seedDebates.update(debates =>
      debates.map(d => d.id === debateId ? { ...d, upvotes: d.upvotes + (voted ? -1 : 1) } : d)
    );
  }

  // ---------------------------------------------------------------------------
  // Acciones del Modal Dialéctico
  // ---------------------------------------------------------------------------
  openNewDebateModal(mode: 'heresy' | 'canonical' = 'heresy'): void {
    this.modalMode.set(mode);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onEscape(): void {
    if (this.isModalOpen()) {
      this.closeModal();
    }
  }

  setModalMode(mode: 'heresy' | 'canonical'): void {
    this.modalMode.set(mode);
  }

  selectTier(tier: 'S' | 'A' | 'B' | 'C' | 'D'): void {
    this.selectedTier.set(tier);
  }

  searchGames(event: AutoCompleteCompleteEvent): void {
    this.rawgService.searchGames(event.query, 6).subscribe({
      next: (games) => this.gameSuggestions.set(games)
    });
  }

  insertSnippet(text: string): void {
    this.argumentContent.update(current => current + '\n' + text);
  }

  async submitDialecticPost(): Promise<void> {
    if (!this.thesisTitle().trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa el título o tesis de la disputa.' });
      return;
    }
    if (!this.argumentContent().trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa la argumentación técnica.' });
      return;
    }

    this.submitting.set(true);
    try {
      const game = this.selectedGame();
      const prefix = this.modalMode() === 'heresy' ? '[Herejía Canónica]' : '[Debate Canónico]';
      const fullTitle = `${prefix} ${this.thesisTitle().trim()} (Tier ${this.selectedTier()})`;

      const created = await this.postsService.createPost({
        game_id: game?.id || 111,
        game_title: game?.name || 'Obra Canónica',
        game_cover: game?.background_image || undefined,
        post_type: 'discussion',
        title: fullTitle,
        content: this.argumentContent().trim(),
        score: null
      });

      this.posts.update(list => [created, ...list]);

      // Prepend to visible feed as well
      const newDebateItem: DialecticDebateItem = {
        id: `d-new-${Date.now()}`,
        authorHandle: this.authService.currentUser()?.user_metadata?.['username'] || 'AlexVance',
        authorLevel: 46,
        authorTitle: this.modalMode() === 'heresy' ? 'Archivista Disidente' : 'Archivista Curador',
        authorAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB07rUlWu5HvOEeCGXNKo1appAkIil5vBXuJauj8h4ebJ7upgNKKzyCVe497Wy-kQi_-ruIPGK4OsPU7WNIPUTeBNeX3Y4DeFO4erblpQ05YdZnQo-kU_p1IHv-9V0WeoNZcCyUYsUEuFNcPA-6v9ssVAsLo0uWLBKfyJ9U3dTGfU_A2RteL0098PO7cEBU5m3_jH8ioZDa1PwDzWJLKvEg6aOT8w_Pg6wh5-j1tWPTmLKsxxo_8kg',
        timeAgo: 'Justo ahora',
        disputeTag: this.modalMode() === 'heresy' ? `Herejía Registrada (Tier ${this.selectedTier()})` : `Debate Canónico (Tier ${this.selectedTier()})`,
        isHot: this.modalMode() === 'heresy',
        gameId: game?.id || 111,
        gameTitle: game?.name || 'Obra en Disputa',
        gameCover: game?.background_image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAze35SaFsGC_03cIOZ8_9BLMloB_CSRDHxlFOZAgvwL6_NytPnqbiKShxxP_-VDSltUrsWaLoUxPISCHdATqLaDKSXh_q3j0wfpl1tzJMUYUJfPcvvTIrtN3IHrekD7fPYJMkLfm0ARIH5AYt9FrcXktb7LjeB4i48UHPo5ji5Y8ij6qxBtkrdERSsChSYiIfZAvkOPlq4ZDlcfpwScceLbcf-gOscU_ZbNXArY3JKI8OAfINwas',
        tags: ['#Ágora', this.modalMode() === 'heresy' ? '#Herejía' : '#Debate'],
        title: this.thesisTitle().trim(),
        summary: this.argumentContent().trim().slice(0, 180) + '...',
        upvotes: 1,
        argumentsCount: 0
      };

      this.seedDebates.update(list => [newDebateItem, ...list]);

      this.messageService.add({
        severity: 'success',
        summary: this.modalMode() === 'heresy' ? '¡Herejía Proclamada (+200 XP)!' : '¡Debate Publicado (+100 XP)!',
        detail: 'Tu tesis ha sido sometida a juicio ante el Tribunal del Ágora.'
      });

      this.closeModal();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al proclamar debate';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.submitting.set(false);
    }
  }
}

export { CommunityComponent as Community };

