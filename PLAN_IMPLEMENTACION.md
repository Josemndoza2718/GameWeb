# Plan de Implementación Consolidado: RetroVerse Gaming Hub (QuestLog)

Este documento define la hoja de ruta técnica completa, el estado de cada fase basada en el diseño de **Stitch ("RetroVerse Gaming Hub")** y las tareas pendientes para mantener sincronizado el desarrollo en cualquier dispositivo.

---

## 1. Matriz de Fases y Estado Actual

| Fase | Módulo / Pantalla | Identificador Stitch / Vista | Estado |
|---|---|---|---|
| **Fase 1** | Design System & Tokens Globales | Paleta Dark Deep Space, Tipografías, Variables CSS | ✅ **Completada** |
| **Fase 2** | Navbar Global & Dock Móvil | [`navbar`](file:///src/app/components/navbar/) | ✅ **Completada** |
| **Fase 3** | Catálogo & Explorador Global | [`dashboard`](file:///src/app/pages/dashboard/) (`46ea3244`) | ✅ **Completada** |
| **Fase 4** | Ficha Detallada & Expediente | [`game-detail`](file:///src/app/pages/game-detail/) (`bfb3cf40`) | ✅ **Completada** |
| **Fase 5** | Mi Biblioteca & Tracker Personal | [`my-library`](file:///src/app/pages/my-library/) (`285e8298`) | ✅ **Completada** |
| **Fase 6** | Tier-List Builder Interactivo | [`tierlist-editor`](file:///src/app/pages/tierlist-editor/) (`6632ab52`) | ✅ **Completada** |
| **Fase 7** | Autenticación Inmersiva (Split Screen) | [`auth`](file:///src/app/components/auth/) (`b71b4d71` & `d70a69b6`) | ✅ **Completada** |
| **Fase 8** | Perfil de Usuario & Configuración Modular | [`profile`](file:///src/app/pages/profile/) (`47c1bb3c`) | ✅ **Completada** |
| **Fase 9** | Ágora de la Comunidad & Modal de Debates | [`community`](file:///src/app/pages/community/) (`26ac83c9` & `f0a8c239`) | ✅ **Completada** |
| **Fase 10** | Secuelas & Franquicias (Sagas) | Extensión en [`game-detail`](file:///src/app/pages/game-detail/) | ✅ **Completada** |
| **Fase 11** | Comparativa de Tier-Lists vs Consenso | Stitch `268043a1` & Modal `236e2218` | ⏳ **Pendiente** |
| **Fase 12** | Flujo de Onboarding & Bienvenida Inicial | Stitch `da5e238b`, `71b992ba`, `f86ecc15` | ✅ **Completada** |
| **Fase 13** | Logros & Trofeos Canónicos | Extensión en [`game-detail`](file:///src/app/pages/game-detail/) | ✅ **Completada** |

---

## 2. Detalle de Fases Completadas

### Fase 1 a Fase 6: Base de la Aplicación y Herramientas Principales
- **Design System**: Estilos globales con modo oscuro profundo, soporte de PrimeFlex y Google Fonts.
- **Navbar**: Barra superior translúcida con logo, buscador integrado, perfil de usuario y barra fija inferior en dispositivos móviles.
- **Catálogo / Dashboard**: Integración con RAWG API, carrusel de lanzamientos destacados, buscador con debounce y paginación.
- **Ficha de Juego**: Vista inmersiva con fondo translúcido, sinopsis completa, ficha técnica, galería con visor lightbox de pantalla completa y guardado de estado en biblioteca.
- **Biblioteca**: Dashboard de estadísticas (juegos totales, completados, porcentaje), filtros por estado (`Jugando`, `Completado`, `Backlog`, etc.) y valoración personal.
- **Tier-List Editor**: Panel de clasificación con filas personalizables S, A, B, C y D, buscador de juegos e inserción en el tablero.

### Fase 7: Autenticación Inmersiva (`/auth`)
- Implementación de pantalla dividida con panel de marca ("Forja de Archivistas") a la izquierda y formularios a la derecha.
- **Login**: Validación reactiva, alternador de visibilidad de contraseña y proveedores OAuth. Al autenticar, verifica `hasCompletedOnboarding(userId)` y redirige a `/onboarding` o `/dashboard` según corresponda.
- **Registro**: Generación de handle público único, cálculo en vivo de robustez de contraseña, selección interactiva de plataformas favoritas (chips) y creación de perfil en Supabase. Tras un registro exitoso con sesión activa, redirige automáticamente a `/onboarding`.
- **Flag de Onboarding**: `AuthService.hasCompletedOnboarding(userId)` / `setOnboardingCompleted(userId)` usando clave `questlog_onboarded_{userId}` en `localStorage`.

### Fase 8: Perfil de Usuario Modular (`/profile`)
- Encabezado con banner heroico, avatar personalizable, medalla de nivel XP y resumen numérico.
- Consola de 5 pestañas reactivas:
  1. *Información Personal*: Modificación de handle, biografía narrativa y consola predilecta.
  2. *Seguridad Criptográfica*: Cambio de credenciales, nivel de protección y lista de sesiones activas.
  3. *Preferencias & Privacidad*: Ajuste de visibilidad pública o privada de la colección y estilo de portadas.
  4. *Ecosistemas*: Estado de sincronización simulado con Steam, PlayStation, Xbox y Nintendo.
  5. *Bóveda Pública*: Visualización de la colección en cuadrícula de tarjetas 3:4.

### Fase 9: Ágora de la Comunidad & Modal de Debates (`/community`)
- **Duelo Dialéctico de la Semana**: Card principal con disputa de tiers (*Castlevania SOTN: Tier S vs Tier B*), votos en tiempo real y barras porcentuales.
- **Feed y Píldoras Temáticas**: Filtrado por *Tendencias*, *Debates Polarizados (Herejías)*, *Nuevos Veredictos* y *Duelos de Curadores*.
- **Sidebar de Curaduría**: Lista de curadores más influyentes con botón de seguir, Herejías aprobadas por la comunidad y misiones semanales.
- **Modal de Creación de Debates**: Selector entre *Debate Canónico* y *Proclamación de Herejía*, vinculación del título exacto con autocompletado RAWG, asignación del tier en disputa y redacción con medidor de rigor argumental.

### Fase 10: Sagas, Secuelas y Franquicias (`/game/:id`)
- Integración en `RawgService` con los endpoints `/games/{id}/game-series` y `/games/{id}/additions`.
- Carrusel deslizante con tarjetas compactas de la saga en proporción 3:4, indicando año, plataforma y puntuación.
- Detección y listado de expansiones y DLCs oficiales.
- Actualización reactiva al seleccionar cualquier entrega sin recarga de página.

### Fase 12: Flujo de Onboarding & Protocolo de Activación (`/onboarding`)
- Implementación de asistente guiado en 3 pasos con barra de progreso y telemetría de calibración en vivo.
- **Paso 1 (Identidad)**: Alias público `@username`, previsualización de credencial de archivista, biografía/manifiesto y selector de arquetipo dialéctico (*Curador de Bóveda*, *Hereje Dialéctico*, *Custodio del 100%*).
- **Paso 2 (Backlog & Calibración)**: Buscador predictivo RAWG en tiempo real, selector de hasta 5 obras clave para la bóveda inicial con tarjetas y chips interactivos.
- **Paso 3 (Ecosistemas & Activación)**: Sincronización simulada con Steam, PlayStation, Nintendo y Xbox, compromiso del archivista y guardado automático en Supabase (`profiles` y `user_games`). Redirección fluida al Dashboard.
- **Persistencia**: Al completar el paso 3, se llama a `AuthService.setOnboardingCompleted(userId)` → clave `questlog_onboarded_{userId}` en `localStorage`.

### Fase 13: Logros & Trofeos Canónicos (`/game/:id`)
- Extensión de la **Ficha Detallada** para mostrar los logros oficiales del juego consumidos desde `GET /games/{id}/achievements`.
- **Modelos**: Interfaz `GameAchievement { id, name, description, image, percent }` en `rawg.model.ts`. Campo `achievements_count?` añadido a `GameDetail`.
- **Servicio**: Método `getGameAchievements(id, pageSize = 32)` en `RawgService`.
- **Componente**: Signals `achievements`, `loadingAchievements`, `achievementFilter`. Métodos `loadAchievementsData()`, `setAchievementFilter()`, `getFilteredAchievements()`, `getRarityLabel()`.
- **Optimización**: Se omite la llamada a `/achievements` si `game.achievements_count === 0`.
- **3 estados de UI**:
  1. Spinner de carga mientras se obtienen los datos.
  2. Grilla de tarjetas de logro con imagen, nombre, descripción, porcentaje de desbloqueadores y badge de rareza.
  3. Estado vacío *"Sin Logros Canónicos Sincronizados"* para juegos sin datos disponibles.
- **Sistema de Rareza** basado en `percent`:
  - `< 2%` → Mítico (ámbar dorado `#ffb95f`)
  - `< 10%` → Épico (violeta neón `#a078ff`)
  - `< 30%` → Raro (cian `#4cd7f6`)
  - `≥ 30%` → Común (verde menta `#22c55e`)
- **Filtros de Rareza**: Botones *Todos / Común / Épico* en la cabecera de la sección.

---

## 3. Próximas Fases en el Backlog

### Fase 11: Comparativa de Tier-Lists vs. Consenso Global (`/tierlist-compare`)
- **Referencia Stitch**: Pantalla `268043a1` (vista principal) y Modal `236e2218` (overlay AlexVance vs Valen_Mage).
- **Objetivos**:
  - Nueva ruta `/tierlist-compare` con componente lazy-loaded.
  - Vista lado a lado de dos tier-lists con resaltado de discrepancias (diferencia ≥ 2 rangos).
  - Modal de overlay de curador con detalle de discrepancias y acciones de votación.

### Fase 14 (Backlog): Juego del Día en Dashboard
- **Origen**: Nota en `gameweb.txt` — *"En el dashboard debemos mejorar la tarjeta del juego mejor valorado, mejor hacer una recomendación de un juego random al día"*.
- **Objetivos**:
  - Reemplazar la tarjeta *"Mejor Valorado"* por una sección *"Juego del Día"*.
  - Usar la fecha actual como semilla de aleatoriedad (resultado consistente durante todo el día).
  - Persistir el `gameId` seleccionado en `localStorage` con clave `questlog_gameoday_{YYYY-MM-DD}`, refrescando automáticamente al día siguiente.

---

## 4. Convenciones y Reglas de Desarrollo (Recordatorio)

1. **Angular 21+**: No agregar `standalone: true` en decoradores (es el valor por defecto).
2. **State Management**: Utilizar exclusivamente Angular Signals (`signal()`, `computed()`) y evitar `.mutate()`.
3. **Control Flow**: Usar sintaxis nativa `@if`, `@for`, `@switch`. Prohibido el uso de `*ngIf`, `*ngFor` y `*ngSwitch`.
4. **Directivas en Componentes**: Usar enlaces directos `[class]` y `[style]` en lugar de `ngClass` y `ngStyle`.
5. **Inyección de Dependencias**: Utilizar la función `inject()` en lugar de constructores tradicionales.
6. **Detección OnPush**: Todos los componentes deben declarar `changeDetection: ChangeDetectionStrategy.OnPush`.
7. **Accesibilidad**: Todos los componentes deben pasar verificaciones AXE y cumplir WCAG AA (foco, contraste de color, atributos ARIA).
8. **Stitch MCP**: Para consultar pantallas de diseño, usar PowerShell `Invoke-RestMethod` con header `X-Goog-Api-Key` a `https://stitch.googleapis.com/mcp`. Project ID: `502256775878837599`.
