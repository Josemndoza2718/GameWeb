import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { SearchBarComponent } from '../search-bar/search-bar.component';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, SearchBarComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  public authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  username = computed(() => {
    const user = this.currentUser();
    return user?.user_metadata?.['username'] || user?.email?.split('@')[0] || 'Gamer';
  });

  userInitial = computed(() => {
    const name = this.username();
    return name.charAt(0).toUpperCase();
  });

  async logout(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/auth']);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  }
}
