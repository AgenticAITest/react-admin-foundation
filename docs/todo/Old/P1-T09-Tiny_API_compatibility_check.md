# P1-T09 — Tiny API compatibility check

**Goal**: Refuse to load a module that doesn’t claim `api: '1.x'`.

**Edit**: `src/server/lib/modules/module-registry.ts` (inside `registerModule(config)`)
```ts
if ((config as any).api && (config as any).api !== '1.x') {
  throw new Error(\`Incompatible plugin API: \${(config as any).api}\`);
}
```

**Accept**:
- Loading a module with the wrong `api` string throws at startup (clear console error).

---
