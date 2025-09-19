# P1-T10 — Transition note: namespace & toggle semantics

**Goal**: Reduce confusion for devs during the transition.

**Edit**: `src/modules/<module-id>/module.config.ts` (or closest metadata file) — add this comment at the top:
```ts
// Phase-1 namespace:
//   Routes are mounted under /api/plugins/<module-id>.
//   A legacy prefix (e.g., /api/<module-id>) may be temporarily mounted for transition.
//
// Toggle semantics:
//   - enabled_global = false  => plugin is OFF platform-wide (tenants cannot override).
//   - enabled_global = true   => tenant-level 'enabled' must also be true to allow access.
```

**Accept**:
- Comment is present (e.g., in inventory module).
