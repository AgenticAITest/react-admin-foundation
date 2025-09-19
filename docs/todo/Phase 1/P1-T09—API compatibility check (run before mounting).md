# P1-T09 — API compatibility check (run before mounting)

**Goal**: Refuse to load a module that doesn’t claim `api: '1.x'` (or your chosen string). Do this **before** upsert and route mounting.

**Edit**: `src/server/lib/modules/module-registry.ts`
```ts
// Inside registerModule(config)
if ((config as any).api && (config as any).api !== '1.x') {
  throw new Error(`Incompatible plugin API: ${(config as any).api}`);
}
```

**Order note**:
- Call this check first, then call the T02 `upsertSysPlugin`, then proceed to T03 routing.

**Accept**:
- Loading an incompatible module throws at startup with a clear message.
