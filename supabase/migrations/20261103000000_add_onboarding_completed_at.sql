-- Persiste en el servidor si el usuario ya completó el protocolo de onboarding.
-- NULL = pendiente; fecha = completado en ese momento.
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Los perfiles que ya existían antes de esta migración se consideran activados,
-- para no obligar a los usuarios actuales a repetir el onboarding.
update public.profiles
  set onboarding_completed_at = coalesce(created_at, now())
  where onboarding_completed_at is null;
