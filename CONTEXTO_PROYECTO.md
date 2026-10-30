# Contexto del Proyecto: RetroVerse Gaming Hub (QuestLog)

Este documento recopila el contexto general, las decisiones arquitectónicas, las tecnologías utilizadas y el progreso detallado de las funcionalidades implementadas en la plataforma web **RetroVerse Gaming Hub** (también referenciada como **QuestLog**).

---

## 1. Visión y Objetivo del Proyecto

**QuestLog / RetroVerse Gaming Hub** es una plataforma web integral para entusiastas del gaming, coleccionistas y preservacionistas digitales. Permite:
- **Explorar y Descubrir**: Catálogo global conectado con la API de RAWG con filtros por plataformas, consolas clásicas y modernas, géneros, puntuaciones y años.
- **Bitácora y Colección Personal**: Gestión del backlog, juegos terminados, en progreso o abandonados con valoración personal y almacenamiento en Supabase.
- **Creación de Tier-Lists**: Herramienta interactiva de clasificación por rangos (S, A, B, C, D) con sincronización en tiempo real y drag & drop.
- **Comunidad y Ágora Dialéctica**: Espacio de debate sobre el canon del gaming, duelos de curadores, proclamación de "Herejías" (opiniones contrarias al consenso general) y votaciones comunitarias.
- **Perfil de Archivista**: Métricas de juego, telemetría XP, gestión de seguridad y vinculación de ecosistemas de consolas.

---

## 2. Pila Tecnológica & Arquitectura

- **Framework**: [Angular 21+](https://angular.dev/) (Arquitectura 100% Standalone, Signals, Control Flow nativo `@if`, `@for`, `@switch`).
- **Detección de Cambios**: `ChangeDetectionStrategy.OnPush` en todos los componentes para máximo rendimiento.
- **UI & Diseño**:
  - **Paleta Temática**: *Dark Deep Space* (fondos `#080b10`, `#0e131d`, acentos violeta neón `#a078ff`, cian `#4cd7f6`, ámbar dorado `#ffb95f` y verde menta `#22c55e`).
  - **Tipografía**: *Space Grotesk* (titulares técnicos / display) y *Plus Jakarta Sans* (lectura).
  - **Iconografía**: Google Material Symbols Outlined.
  - **Librerías de Soporte**: PrimeNG (ProgressSpinner, Toast, Rating, etc.) y PrimeFlex.
- **Backend & Base de Datos**:
  - [Supabase](https://supabase.com/) (Autenticación, PostgreSQL para perfiles, biblioteca de usuario, posts de debate, votos y seguimiento de curadores).
  - **Confirmación de email**: Deshabilitada en Supabase Dashboard → Authentication → Providers → Email, para permitir registro inmediato sin validación de correo.
- **APIs Externas**:
  - [RAWG Video Games Database API](https://rawg.io/apidocs): Consulta de metadatos de más de 500,000 juegos, capturas de pantalla, secuelas/franquicias, DLCs y logros canónicos.
  - Endpoints utilizados:
    - `GET /games` — Catálogo con filtros
    - `GET /games/{id}` — Ficha detallada del juego
    - `GET /games/{id}/screenshots` — Galería de capturas
    - `GET /games/{id}/game-series` — Saga y secuelas
    - `GET /games/{id}/additions` — DLCs y expansiones
    - `GET /games/{id}/achievements` — Logros canónicos (con `percent`, `description`, `image`)
- **Herramienta de Diseño**:
  - [Stitch (Google)](https://stitch.googleapis.com/mcp): Prototipo visual de referencia *"RetroVerse Gaming Hub"* (Project ID: `502256775878837599`). Accedido vía PowerShell `Invoke-RestMethod` con header `X-Goog-Api-Key`. API Key almacenada en `.env` como `STITCH_API_KEY`. Configurado como servidor MCP en `.vscode/mcp.json`.

---

## 3. Estado de Módulos y Funcionalidades Desarrolladas

### 3.1 Catálogo & Exploración (`/dashboard`)
- **Spotlight Hero**: Presentación de lanzamientos destacados o títulos de culto con fondo atmosférico.
- **Buscador Reactivo**: Barra de búsqueda precisa conectada a RAWG con debounce.
- **Filtros Avanzados**:
  - **Familias de Plataformas**: Nintendo, Sony PlayStation, Microsoft Xbox y PC.
  - **Submenú de Consolas Específicas**: Filtrado granular (ej. PS1, PS2, PS3, PS4, PS5, PSP, PS Vita; NES, SNES, N64, GameCube, Wii, Switch, Game Boy, GBA, DS, 3DS; Xbox Clásica, 360, One, Series X/S).
  - **Filtro de Puntuación Flexible**: Presets rápidos (Élite 90-100, Excelente 80-100, etc.) y selector personalizado por rango exacto (0-100).
- **Grilla de Bóveda (3:4)**: Tarjetas compactas idénticas al diseño de la bóveda del perfil de usuario, con degradados, puntuación y fallback para imágenes no disponibles.
- **Paginación Dinámica**: Navegación entre páginas de resultados manteniendo filtros aplicados.

### 3.2 Ficha Detallada & Expediente (`/game/:id`)
- **Hero Inmersivo**: Backdrop con imagen difuminada, box-art foil interactivo con zoom, plataformas técnicas y medidor de aclamación Metacritic.
- **Bitácora Personal**: Selector de estados (`Jugando`, `Completado`, `Backlog`, `En Espera`, `Abandonado`) con sincronización inmediata con Supabase y valoración por estrellas.
- **Expediente & Ficha Técnica**: Sinopsis completa, desarrolladores, publishers, fecha de estreno, duración promedio en horas y enlace oficial.
- **Galería de Capturas con Lightbox**: Modal a pantalla completa para explorar capturas de pantalla de alta resolución mediante teclado (`Esc`, flechas) o miniaturas inferiores.
- **Saga, Secuelas & Franquicia**: Carrusel horizontal en formato tarjeta bóveda que detecta secuelas, precuelas y títulos vinculados a la saga mediante `/games/{id}/game-series`, además de una subsección dedicada a expansiones y DLCs oficiales (`/games/{id}/additions`). Al hacer clic en cualquier entrega, la ficha recarga reactivamente la nueva entrega sin recargar la página.
- **Logros & Trofeos Canónicos**: Sección de hazañas del juego consumida desde `/games/{id}/achievements`. Implementa:
  - **3 estados de renderizado**: Spinner de carga, grilla de tarjetas de logro, y estado vacío *"Sin Logros Canónicos Sincronizados"* para juegos sin datos.
  - **Sistema de Rareza**: Clasificación automática por `percent` (porcentaje de jugadores que lo desbloquearon):
    - `< 2%` → *Mítico* (ámbar dorado)
    - `< 10%` → *Épico* (violeta neón)
    - `< 30%` → *Raro* (cian)
    - `≥ 30%` → *Común* (verde menta)
  - **Filtros de Rareza**: Botones de filtrado rápido (Todos / Común / Épico).
  - **Optimización**: Si `achievements_count === 0` en la ficha principal, se omite la llamada al endpoint de logros.

### 3.3 Mi Biblioteca & Tracker (`/my-library`)
- **Resumen Bento del Jugador**: Nivel de archivista, medidor de XP, desglose de estados de colección y porcentaje de juegos completados.
- **Filtros por Estado de Juego**: Filtro rápido por pestañas con contadores en tiempo real.
- **Gestión Directa**: Actualización de estados, notas personales y valoraciones directamente desde las tarjetas de la biblioteca.

### 3.4 Tier-List Builder (`/tierlist-editor`)
- **Matriz Neón**: Niveles S, A, B, C y D con colores distintivos configurables.
- **Banco de Juegos No Clasificados**: Búsqueda e incorporación de juegos desde la API para arrastrar a la matriz.
- **Interacción Fluida**: Soporte de reordenamiento y exportación de listas.

### 3.5 Autenticación Dividida (`/auth`)
- **Diseño Split-Screen Asimétrico**: Panel izquierdo con branding de la Bóveda QuestLog y panel derecho con formularios de alta fidelidad.
- **Modo Login**: Entrada con correo/usuario, contraseña con toggle de visibilidad y acceso con proveedores externos. Al iniciar sesión, verifica `hasCompletedOnboarding(userId)` y redirige a `/onboarding` si corresponde, o a `/dashboard` si ya completó el proceso.
- **Modo Registro**: Handle único de archivista con slug dinámico, medidor de seguridad de contraseña de 4 niveles, selector de plataformas preferidas (chips seleccionables) y aceptación de protocolo. Tras un registro exitoso con sesión activa, redirige automáticamente a `/onboarding`.
- **Flag de Onboarding**: `AuthService` expone `hasCompletedOnboarding(userId)` y `setOnboardingCompleted(userId)`. El estado se persiste en `localStorage` bajo la clave `questlog_onboarded_{userId}`.

### 3.6 Perfil de Usuario & Configuración Modular (`/profile`)
- **Cabecera de Identidad**: Avatar con gradiente, insignia de rango (ej. *Archivista Rango Maestro LV. 46*), botón de compartir ficha y estadísticas globales.
- **Panel Modular de 5 Pestañas**:
  1. *Información Personal*: Edición de bio, apodo y plataforma predilecta.
  2. *Seguridad Criptográfica*: Cambio de credenciales, monitor de sesiones activas e historial de accesos.
  3. *Preferencias & Privacidad*: Visibilidad pública/privada de la bóveda y estilo de carátulas.
  4. *Ecosistemas Conectados*: Vinculación simulada de cuentas Steam, PlayStation Network, Xbox y Nintendo.
  5. *Bóveda & Colección Pública*: Galería en grilla compacta de juegos guardados, tier-lists creadas y contribuciones comunitarias.

### 3.7 Ágora de la Comunidad & Debates Dialécticos (`/community`)
- **Duelo Dialéctico de la Semana**: Card destacada a pantalla completa para controversias históricas (ej. *Castlevania: Symphony of the Night ¿Tier S o Tier B?*) con barra de polarización interactiva y votación en vivo.
- **Feed de Discusiones**: Filtros temáticos (*En Tendencia*, *Debates Polarizados / Herejías*, *Nuevos Veredictos*, *Duelos de Curadores*, *Sin Resolver*), tarjetas con avatar, insignias y métricas de discrepancia.
- **Sidebar de Curaduría**: Ranking de Curadores influyentes con opción de seguir, Herejías de la Bóveda con porcentaje de aprobación, Misiones comunitarias semanales y enlace al Discord oficial.
- **Modal de Protocolo Dialéctico**:
  - Selector de modo: *Debate Canónico* (violeta) vs *Proclamación de Herejía* (ámbar fuego).
  - Buscador predictivo de videojuegos conectado a RAWG.
  - Matriz de disputa de Tiers (comparar tier propuesto vs consenso).
  - Editor con medidor de rigor argumental (0-100%) y cálculo de recompensa XP.

### 3.8 Protocolo de Onboarding Inicial (`/onboarding`)
- **Secuencia de 3 Pasos Calibrados**:
  1. *Identidad & Arquetipo*: Alias público, previsualización en vivo de credencial, biografía y selección de rol (*Curador de Bóveda*, *Hereje Dialéctico*, *Custodio del 100%*).
  2. *Calibración de Bóveda*: Buscador predictivo conectado a RAWG para seleccionar hasta 5 títulos que definan el gusto inicial del usuario.
  3. *Ecosistemas & Activación*: Sincronización omnicanal (Steam, PlayStation, Nintendo, Xbox), confirmación del compromiso de preservación y persistencia directa en Supabase (`profiles` y `user_games`).
- **Persistencia de estado**: Al finalizar el paso 3, `AuthService.setOnboardingCompleted(userId)` guarda la clave `questlog_onboarded_{userId}` en `localStorage` y redirige a `/dashboard`.
- **Flujo de acceso**: La ruta `/onboarding` está protegida por `authGuard`. Solo usuarios autenticados que no hayan completado el onboarding llegan a esta pantalla.

---

## 4. Estructura de Directorios Clave

```
game-web/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── auth/              # Pantallas Split de Login y Registro
│   │   │   ├── navbar/            # Barra de navegación principal y mobile dock
│   │   │   ├── search-bar/        # Buscador global con autocompletado
│   │   │   └── ui/                # Componentes atómicos reutilizables
│   │   ├── models/                # Interfaces TypeScript (RAWG, UserGame, GameAchievement, etc.)
│   │   ├── pages/
│   │   │   ├── dashboard/         # Catálogo con filtros avanzados
│   │   │   ├── game-detail/       # Ficha de juego, galería, lightbox, franquicia y logros
│   │   │   ├── my-library/        # Tracker y bóveda personal
│   │   │   ├── onboarding/        # Asistente de activación inicial (3 pasos)
│   │   │   ├── tierlist-editor/   # Creador de tier-lists
│   │   │   ├── profile/           # Perfil modular y configuración
│   │   │   └── community/         # Ágora, duelos y modal de debate
│   │   └── services/              # Supabase (Auth, UserGames, Posts, Profile) y RAWG API
│   ├── assets/
│   │   └── images/                # Placeholders temáticos SVG/PNG (placeholder-game.svg/.png)
│   └── env/                       # Variables de entorno (Supabase URL/Key, RAWG API Key)
├── .env                           # STITCH_API_KEY para acceso al MCP de Stitch
├── .vscode/mcp.json               # Configuración del servidor MCP de Stitch
├── AGENTS.md                      # Reglas de codificación Angular y TypeScript
├── CONTEXTO_PROYECTO.md           # Contexto general y estado del proyecto (este archivo)
├── PLAN_IMPLEMENTACION.md         # Fases detalladas de implementación y backlog
└── README.md                      # Guía rápida de instalación y ejecución
```
