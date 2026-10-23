import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./components/auth/auth.component').then((m) => m.AuthComponent),
    title: 'Autenticación - Game Web'
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
    title: 'Mi Biblioteca - Game Web'
  },
  {
    path: 'my-library',
    loadComponent: () =>
      import('./pages/my-library/my-library').then((m) => m.MyLibraryComponent),
    title: 'Mi Biblioteca - Game Web'
  },
  {
    path: 'community',
    loadComponent: () =>
      import('./pages/community/community').then((m) => m.CommunityComponent),
    title: 'Comunidad - Game Web'
  },
  {
    path: 'tierlist/create',
    loadComponent: () =>
      import('./pages/tierlist-editor/tierlist-editor').then((m) => m.TierlistEditorComponent),
    title: 'Crear Tierlist - Game Web'
  },
  {
    path: 'tierlist/edit/:id',
    loadComponent: () =>
      import('./pages/tierlist-editor/tierlist-editor').then((m) => m.TierlistEditorComponent),
    title: 'Editar Tierlist - Game Web'
  },
  {
    path: 'profile/:username',
    loadComponent: () =>
      import('./pages/profile/profile').then((m) => m.ProfileComponent),
    title: 'Perfil - Game Web'
  },
  {
    path: 'game/:id',
    loadComponent: () =>
      import('./pages/game-detail/game-detail').then((m) => m.GameDetailComponent),
    title: 'Detalle del Juego - Game Web'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
