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
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
