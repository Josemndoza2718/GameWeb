# 🎮 RetroVerse Gaming Hub (QuestLog)

Plataforma web de preservación de videojuegos, gestión de colecciones personales (backlog / bitácora), creador interactivo de tier-lists, feed de debates comunitarios y análisis de franquicias y sagas completas.

Inspirado en el diseño conceptual **Stitch: "RetroVerse Gaming Hub"**.

---

## 🚀 Pila Tecnológica

- **Framework**: [Angular 21+](https://angular.dev/) (Standalone Components, Signals reactivos, Control Flow nativo).
- **Estrategia de Renderizado**: `ChangeDetectionStrategy.OnPush` en toda la aplicación.
- **Estilos & UI**:
  - Paleta *Dark Deep Space* con acentos de neón violeta, cian y ámbar.
  - Tipografías *Space Grotesk* y *Plus Jakarta Sans*.
  - Iconos de Google Material Symbols Outlined.
  - PrimeFlex + Componentes seleccionados de PrimeNG (Toast, ProgressSpinner, Rating).
- **Backend**: [Supabase](https://supabase.com/) (Autenticación, PostgreSQL y sincronización de colecciones/debates).
- **Base de Datos de Videojuegos**: [RAWG API](https://rawg.io/apidocs) (Catálogo global con más de 500k juegos, capturas, secuelas y expansiones).

---

## 📦 Características Principales

1. **Catálogo & Búsqueda Avanzada (`/dashboard`)**:
   - Hero banner con títulos destacados.
   - Filtro dinámico por familias de plataformas (Nintendo, PlayStation, Xbox, PC) y submenús por consola específica (PS1 a PS5, NES a Switch, Xbox Clásica a Series X).
   - Filtro de puntuación por presets (Élite, Excelente, etc.) y selector por rango exacto (0-100).
   - Grilla compacta de tarjetas estilo bóveda (proporción 3:4).
2. **Ficha Detallada & Franquicias (`/game/:id`)**:
   - Resumen completo, sinopsis, ficha técnica y duración promedio.
   - Visor Lightbox a pantalla completa con navegación por teclado para la galería de capturas.
   - **Saga & Franquicia**: Carrusel con secuelas, precuelas y DLCs oficiales con recarga reactiva sin salir de la vista.
   - **Bitácora Personal**: Registro instantáneo del estado de juego y valoración por estrellas conectado a Supabase.
3. **Mi Biblioteca & Tracker (`/my-library`)**:
   - Panel bento con nivel de archivista y barra de telemetría de XP.
   - Filtros por estado: *Jugando*, *Completado*, *Backlog*, *En Espera* y *Abandonado*.
4. **Tier-List Builder (`/tierlist-editor`)**:
   - Matriz neón editable (S, A, B, C, D) con banco de juegos y reordenamiento interactivo.
5. **Comunidad & Ágora Dialéctica (`/community`)**:
   - Duelo argumental destacado de la semana con votación polarizada en tiempo real.
   - Feed de debates temáticos y proclamaciones de Herejía.
   - Modal interactivo para iniciar debates canónicos o herejías con verificación RAWG y medidor de rigor argumental.
6. **Perfil de Usuario & Configuración (`/profile`)**:
   - 5 pestañas modulares: Información Personal, Seguridad Criptográfica, Preferencias y Privacidad, Ecosistemas conectados y Bóveda pública.
7. **Autenticación Inmersiva (`/auth`)**:
   - Pantalla dividida con vista de inicio de sesión y registro de custodios con cálculo de fortaleza de contraseña.

---

## 🛠️ Instalación y Puesta en Marcha

### Prerrequisitos
- [Node.js](https://nodejs.org/) v20 o superior.
- [Angular CLI](https://angular.dev/tools/cli) v21+.
- Clave de API de [RAWG](https://rawg.io/apidocs).
- Proyecto configurado en [Supabase](https://supabase.com/).

### Pasos

1. Clonar el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd game-web
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno en `src/env/environment.ts` y `src/env/environment.development.ts`:
   ```typescript
   export const environment = {
     production: false,
     rawgApiKey: 'TU_API_KEY_DE_RAWG',
     supabaseUrl: 'TU_SUPABASE_URL',
     supabaseKey: 'TU_SUPABASE_ANON_KEY'
   };
   ```

4. Ejecutar el servidor de desarrollo local:
   ```bash
   npm start
   # o bien: ng serve
   ```
   Abrir el navegador en `http://localhost:4200/`.

5. Compilar para producción o verificar tipos:
   ```bash
   npm run ng -- build --configuration development
   ```

---

## 📚 Documentación de Referencia en el Repositorio

Para no perder el hilo ni el contexto de trabajo en otros equipos, consulta:
- **`CONTEXTO_PROYECTO.md`**: Explicación detallada de la arquitectura, decisiones de diseño, módulos desarrollados y estructura de carpetas.
- **`PLAN_IMPLEMENTACION.md`**: Hoja de ruta técnica con el estado de cada una de las 12 fases del proyecto y especificaciones de las tareas pendientes.
- **`AGENTS.md`**: Reglas y directrices de codificación obligatorias (Signals, Standalone, OnPush, Control Flow nativo).
