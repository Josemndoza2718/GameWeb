import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Importación de componentes de PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-auth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CardModule,
    MessageModule
  ],
  templateUrl: './auth.component.html'
})
export class AuthComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isRegister = signal<boolean>(false);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  email = '';
  password = '';
  username = '';

  toggleMode() {
    this.isRegister.update(val => !val);
    this.errorMessage.set(null);
  }

  async onSubmit() {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      if (this.isRegister()) {
        await this.authService.signUp(this.email, this.password, this.username);
        alert('¡Registro exitoso! Revisa tu correo si requiere confirmación.');
      } else {
        await this.authService.signIn(this.email, this.password);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithProvider(provider: 'google' | 'discord') {
    try {
      await this.authService.signInWithProvider(provider);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado';
      this.errorMessage.set(message);
    }
  }
}