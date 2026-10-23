import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guard para proteger rutas privadas.
 * Requiere que el usuario tenga una sesión activa.
 * Si no está autenticado, redirige a /auth y preserva la URL de origen.
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.ensureAuthenticated();

  if (!isAuthenticated) {
    return router.createUrlTree(['/auth'], {
      queryParams: { returnUrl: state.url }
    });
  }

  return true;
};
