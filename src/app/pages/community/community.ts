import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { RatingModule } from 'primeng/rating';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService } from 'primeng/api';

// Servicios y Modelos
import { Post, PostType, POST_TYPE_LABELS } from '../../models/post.model';
import { Game } from '../../models/rawg.model';
import { PostsService } from '../../services/posts';
import { RawgService } from '../../services/rawg';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-community',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    RatingModule,
    AutoCompleteModule,
    ProgressSpinnerModule,
    ToastModule,
    SelectButtonModule
  ],
  providers: [MessageService],
  templateUrl: './community.html',
  styleUrl: './community.css'
})
export class CommunityComponent implements OnInit {
  private postsService = inject(PostsService);
  private rawgService = inject(RawgService);
  public authService = inject(AuthService);
  private messageService = inject(MessageService);

  currentUsername = computed(() => {
    const user = this.authService.currentUser();
    return user?.user_metadata?.['username'] || '';
  });

  posts = signal<Post[]>([]);
  loading = signal<boolean>(true);
  submitting = signal<boolean>(false);
  displayNewPostDialog = false;

  // Filtros del feed
  selectedFilter = signal<PostType | 'all'>('all');
  filterOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Reseñas', value: 'review' },
    { label: 'Preguntas', value: 'question' },
    { label: 'Consejos', value: 'advice' },
    { label: 'Debates', value: 'discussion' }
  ];

  // Formulario de nuevo post
  selectedGame = signal<Game | null>(null);
  gameSuggestions = signal<Game[]>([]);
  postTypeOptions = [
    { label: 'Reseña', value: 'review' },
    { label: 'Pregunta / Duda', value: 'question' },
    { label: 'Consejo / Guía', value: 'advice' },
    { label: 'Debate General', value: 'discussion' }
  ];

  formPostType: PostType = 'review';
  formTitle = '';
  formContent = '';
  formRating: number | null = 4; // 1-5 estrellas (se multiplica a 1-10)

  ngOnInit(): void {
    this.loadPosts();
  }

  async loadPosts(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.postsService.getPosts(this.selectedFilter());
      this.posts.set(data);
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(type: PostType | 'all'): void {
    this.selectedFilter.set(type);
    this.loadPosts();
  }

  // Autocompletado de juego al crear publicación
  searchGames(event: AutoCompleteCompleteEvent): void {
    this.rawgService.searchGames(event.query, 5).subscribe({
      next: (games) => this.gameSuggestions.set(games)
    });
  }

  openNewPostModal(): void {
    this.displayNewPostDialog = true;
  }

  async submitPost(): Promise<void> {
    const game = this.selectedGame();
    if (!game) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debes seleccionar un videojuego.' });
      return;
    }
    if (!this.formTitle.trim() || !this.formContent.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Completa el título y contenido.' });
      return;
    }

    this.submitting.set(true);
    try {
      const newPost = await this.postsService.createPost({
        game_id: game.id,
        game_title: game.name,
        game_cover: game.background_image,
        post_type: this.formPostType,
        title: this.formTitle,
        content: this.formContent,
        score: this.formPostType === 'review' && this.formRating ? this.formRating * 2 : null
      });

      // Agregar al feed localmente
      this.posts.update(current => [newPost, ...current]);
      this.messageService.add({ severity: 'success', summary: 'Publicado', detail: 'Tu aporte está visible en la comunidad.' });

      // Resetear formulario
      this.resetForm();
      this.displayNewPostDialog = false;
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    } finally {
      this.submitting.set(false);
    }
  }

  async deletePost(postId: string): Promise<void> {
    try {
      await this.postsService.deletePost(postId);
      this.posts.update(current => current.filter(p => p.id !== postId));
      this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: 'Publicación eliminada.' });
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
    }
  }

  private resetForm(): void {
    this.selectedGame.set(null);
    this.formTitle = '';
    this.formContent = '';
    this.formPostType = 'review';
    this.formRating = 4;
  }

  getLabelInfo(type: PostType) {
    return POST_TYPE_LABELS[type] || { label: type, severity: 'info' };
  }
}