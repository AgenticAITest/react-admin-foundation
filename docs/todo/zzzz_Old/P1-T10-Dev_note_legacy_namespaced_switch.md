# P1-T10 — Dev note: legacy → namespaced switch

**Goal**: Prevent confusion for existing callers.

**Edit**: `src/modules/<module-id>/module.config.ts` — add a comment at top
```ts
// NOTE: routes are mounted under /api/plugins/<module-id> (Phase-1 namespace).
// The legacy prefix (e.g., "/api/<module-id>") may be temporarily mounted for backward compatibility and will be removed later.
```

**Accept**:
- Comment is present so developers know where routes live now.

---

## Phase 1 — Done When (re-check)

- Enable/disable works per tenant (via API T05; optional UI T08).
- All plugin routes are namespaced `/api/plugins/:id/*` and gated (T03, T04).
- Logs include `{ pluginId, tenantId }` (T06).
- One existing module verified under the new namespace (T07).
