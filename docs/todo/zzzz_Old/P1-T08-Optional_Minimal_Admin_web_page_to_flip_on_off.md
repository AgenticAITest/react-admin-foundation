# P1-T08 — (Optional) Minimal Admin web page to flip on/off

**Goal**: Quick page so Controller doesn’t need Postman.

**Create**: `src/client/pages/AdminPlugins.tsx`
```tsx
import { useEffect, useState } from 'react';

export default function AdminPlugins() {
  const [tenantId, setTenantId] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    if (!tenantId) return;
    const r = await fetch(\`/api/system/tenants/\${tenantId}/plugins\`);
    setRows(await r.json());
  }
  async function toggle(pid: string, enabled: boolean) {
    await fetch(\`/api/system/tenants/\${tenantId}/plugins/\${pid}\`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    load();
  }

  useEffect(() => { load(); }, [tenantId]);

  return (
    <div className="p-4">
      <h1>Plugins</h1>
      <input placeholder="tenantId" value={tenantId} onChange={e=>setTenantId(e.target.value)} />
      <button onClick={load}>Load</button>
      <ul>
        {rows.map(r => (
          <li key={r.plugin_id}>
            {r.plugin_id} — v{r.version_installed} — enabled: {String(r.enabled)}
            <button onClick={()=>toggle(r.plugin_id, !r.enabled)} style={{marginLeft: 8}}>
              {r.enabled ? 'Disable' : 'Enable'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Accept**:
- Page loads and toggles plugin for a tenant.

---
