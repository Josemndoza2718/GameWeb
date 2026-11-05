import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'game/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'tierlist/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'profile/:username',
    renderMode: RenderMode.Server
  },
  {
    path: 'my-library',
    renderMode: RenderMode.Client
  },
  {
    // Depende de la sesión del navegador: el guard debe evaluarse en el cliente
    // (también procesa el retorno de los proveedores OAuth).
    path: 'onboarding',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
