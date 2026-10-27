import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura
      },
      license: 'eyJpZCI6IjY3ZjNiYjc4LTZkMWItNGIyMS04ZWYwLTMwM2U5MzQwYTQxNyIsInByb2R1Y3QiOiJwcmltZXVpIiwidGllciI6ImNvbW11bml0eSIsInR5cGUiOiJkZXYiLCJpYXQiOjE3OTE0OTA3MDUsImV4cCI6MTgyMzAyNjcwNX0.rFp_-gaht2GhhxoKHEsiVpe1fGFUfiPXpqwuV5jKNsCWyJTptmJvislRCk4hJJFRnqVge3RhkFn-KdAsRKotDg'
    })
  ]
};

