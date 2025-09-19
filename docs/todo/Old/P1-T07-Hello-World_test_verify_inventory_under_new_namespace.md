# P1-T07 — Hello-World test (verify inventory under new namespace)

**Goal**: Verify mount + gating work with an existing module (e.g., `inventory`).

**Test (browser/Postman)**:
- Before enabling: `GET /api/plugins/inventory/health` → **403** `PLUGIN_DISABLED`.
- Enable via Admin API (T05).
- After enabling: `GET /api/plugins/inventory/health` → **200** `{ ok: true, plugin: "inventory" }`.
- Try one existing route `GET /api/plugins/inventory/<your-existing-path>` → returns data (auth permitting).

**Accept**:
- Both checks pass.

---
