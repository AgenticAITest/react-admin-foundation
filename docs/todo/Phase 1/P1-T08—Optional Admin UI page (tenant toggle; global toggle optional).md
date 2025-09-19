# P1-T08 — Optional Admin UI page (tenant toggle; global toggle optional)

**Goal**: Minimal UI for non-technical operators. You can add a global toggle later or keep it API-only for now.

**Create**: `src/client/pages/AdminPlugins.tsx`
```tsx
import { useEffect, useState } from 'react';

export default function AdminPlugins() {
  const [tenantId, setTenantId] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    if (!tenantId) return;
    const r = await fetch(`/api/system/tenants/${tenantId}/plugins`);
    setRows(await r.json());
  }

  async function toggleTenant(pid: string, enabled: boolean) {
    await fetch(`/api/system/tenants/${tenantId}/plugins/${pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
            <button onClick={()=>toggleTenant(r.plugin_id, !r.enabled)} style={{marginLeft: 8}}>
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
- Page lists plugins for a tenant and flips tenant enable/disable.
