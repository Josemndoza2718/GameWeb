import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guard para proteger rutas públicas exclusivas (p. ej. Login / Registro).
 * Si el usuario ya está autenticado, lo redirige al dashboard.
 */
export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.ensureAuthenticated();

  if (isAuthenticated) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
