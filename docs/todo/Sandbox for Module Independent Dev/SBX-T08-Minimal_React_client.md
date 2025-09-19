# SBX-T08 — Minimal React client

**Create**: `client/index.html`
```html
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title><module-id> Sandbox</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Create**: `client/src/main.tsx`
```tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');

  async function load() {
    const r = await fetch('/api/plugins/<module-id>/items');
    setItems(await r.json());
  }
  async function add() {
    if (!name.trim()) return;
    await fetch('/api/plugins/<module-id>/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    setName('');
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>{'<module-id>'} Sandbox</h1>
      <div>
        <input placeholder="item name" value={name} onChange={e=>setName(e.target.value)} />
        <button onClick={add}>Add</button>
      </div>
      <ul>
        {items.map((it:any) => <li key={it.id}>{it.name}</li>)}
      </ul>
      <p>Health: <a href="/api/plugins/<module-id>/health">Check</a></p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
```

---

## How to run in Replit (no CLI tricks)

- Set **Secret** `DATABASE_URL` to your Neon connection string.
- Optional Secrets: `DEV_TENANT_CODE`, `DEV_TENANT_SCHEMA`.
- Set **Run command** to: `npm run dev`.
- Open the Replit URL → you’ll see the page.
- Click **Add** → row is inserted into `tenant_dev.items` in Neon.
- Refresh → items are loaded from Neon via Drizzle.
