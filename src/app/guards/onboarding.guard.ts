import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guard para la ruta /onboarding.
 * - Sin sesión activa: redirige a /auth.
 * - Onboarding ya completado: redirige a /dashboard.
 * - Usuario autenticado con onboarding pendiente: permite el acceso.
 */
export const onboardingGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.ensureAuthenticated();
  if (!isAuthenticated) {
    return router.createUrlTree(['/auth']);
  }

  if (await authService.hasCompletedOnboarding()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
