import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

interface PlatformOption {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-auth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.css'
})
export class AuthComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Modo de visualización: false = Login ("Acceder a tu Bóveda"), true = Registro ("Forja tu Bóveda")
  isRegister = signal<boolean>(false);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Campos de formulario
  email = signal<string>('');
  password = signal<string>('');
  username = signal<string>('');
  confirmPassword = signal<string>('');
  showPassword = signal<boolean>(false);
  rememberTerminal = signal<boolean>(true);
  acceptTerms = signal<boolean>(true);
  acceptNewsletter = signal<boolean>(true);
  selectedPlatform = signal<string>('steam');

  // Plataformas disponibles para registro
  platforms: PlatformOption[] = [
    { id: 'steam', label: 'PC / Steam', icon: 'laptop_windows' },
    { id: 'psn', label: 'PlayStation', icon: 'gamepad' },
    { id: 'switch', label: 'Nintendo', icon: 'toggle_on' },
    { id: 'xbox', label: 'Xbox Hub', icon: 'stadia_controller' },
    { id: 'retro', label: 'Retro / Emu', icon: 'history' }
  ];

  // Identificador canónico reactivo derivado del username
  slug = computed(() => {
    const val = this.username().trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return val.length > 0 ? val : 'tu-identidad';
  });

  // Nickname para previsualización de credencial
  cardNickname = computed(() => {
    const val = this.username().trim();
    return val.length > 0 ? val : 'AlexVance';
  });

  // Métricas de robustez de contraseña
  hasMinLength = computed(() => this.password().length >= 8);
  hasUppercase = computed(() => /[A-Z]/.test(this.password()));
  hasDigits = computed(() => /[0-9]/.test(this.password()));
  hasSpecial = computed(() => /[^A-Za-z0-9]/.test(this.password()));

  strengthScore = computed(() => {
    let score = 0;
    if (this.hasMinLength()) score++;
    if (this.hasUppercase()) score++;
    if (this.hasDigits()) score++;
    if (this.hasSpecial()) score++;
    return score;
  });

  strengthLabel = computed(() => {
    const score = this.strengthScore();
    if (score <= 1) return 'Nivel: Básico';
    if (score === 2) return 'Nivel: Medio';
    if (score === 3) return 'Nivel: Robusto';
    return 'Nivel: Excelente';
  });

  passwordsMatch = computed(() => {
    const pwd = this.password();
    const confirm = this.confirmPassword();
    return pwd.length > 0 && confirm.length > 0 && pwd === confirm;
  });

  toggleMode() {
    this.isRegister.update(val => !val);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  togglePasswordVisibility() {
    this.showPassword.update(val => !val);
  }

  selectPlatform(platformId: string) {
    this.selectedPlatform.set(platformId);
  }

  async onSubmit() {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      if (this.isRegister()) {
        if (!this.username().trim()) {
          throw new Error('Por favor, ingresa tu Nickname de archivista.');
        }
        if (!this.email().trim()) {
          throw new Error('Por favor, ingresa tu correo electrónico.');
        }
        if (this.password().length < 6) {
          throw new Error('La contraseña debe contener al menos 6 caracteres.');
        }
        if (this.password() !== this.confirmPassword()) {
          throw new Error('Las contraseñas ingresadas no coinciden.');
        }
        if (!this.acceptTerms()) {
          throw new Error('Debes aceptar los Términos del Manifiesto de Preservación.');
        }

        const authData = await this.authService.signUp(this.email().trim(), this.password(), this.username().trim());
        
        // Si Supabase devuelve la sesión activa de inmediato (confirmación deshabilitada), ingresa directo al flujo de onboarding
        if (authData.session) {
          this.successMessage.set('¡Bóveda forjada con éxito! Iniciando secuencia de activación...');
          // Redirigir de inmediato al onboarding para forjar su bóveda
          this.router.navigate(['/onboarding']);
        } else {
          this.successMessage.set('¡Bóveda creada exitosamente! Accediendo a tu protocolo de iniciación...');
          // En caso de que se haya creado sin sesión automática, iniciamos sesión programática
          try {
            await this.authService.signIn(this.email().trim(), this.password());
            this.router.navigate(['/onboarding']);
          } catch {
            this.isRegister.set(false);
          }
        }
      } else {
        if (!this.email().trim() || !this.password()) {
          throw new Error('Por favor, ingresa tu identificador y contraseña maestra.');
        }

        const res = await this.authService.signIn(this.email().trim(), this.password());
        const user = res.user;

        // Si el usuario no ha completado el onboarding, llevarlo a /onboarding primero
        if (user && !this.authService.hasCompletedOnboarding(user.id)) {
          this.router.navigate(['/onboarding']);
          return;
        }

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado al procesar la bóveda.';
      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithProvider(provider: 'google' | 'discord') {
    try {
      this.errorMessage.set(null);
      await this.authService.signInWithProvider(provider);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error con el proveedor de autenticación.';
      this.errorMessage.set(message);
    }
  }

  onSocialClick(networkName: string) {
    if (networkName === 'google' || networkName === 'discord') {
      this.loginWithProvider(networkName);
    } else {
      this.errorMessage.set(`El enlace directo con ${networkName} se activará en tu panel de conexiones una vez dentro de la Bóveda.`);
    }
  }
}
