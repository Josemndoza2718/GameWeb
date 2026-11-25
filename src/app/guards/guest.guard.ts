import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guard para proteger rutas públicas exclusivas (p. ej. Login / Registro).
 * Si el usuario ya está autenticado:
 * - Si completó el onboarding, lo redirige a /dashboard.
 * - Si aún tiene el onboarding pendiente, lo redirige a /onboarding.
 */
export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.ensureAuthenticated();

  if (isAuthenticated) {
    const completed = await authService.hasCompletedOnboarding();
    return router.createUrlTree([completed ? '/dashboard' : '/onboarding']);
  }

  return true;
};
