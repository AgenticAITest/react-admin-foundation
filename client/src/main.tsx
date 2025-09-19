import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// Mock auth context for sandbox
const AuthContext = createContext({
  user: {
    username: 'dev',
    roles: ['OWNER'],
    permissions: [
      'sample.items.read',
      'sample.items.create', 
      'sample.items.update',
      'sample.items.delete'
    ]
  }
});

const useAuth = () => useContext(AuthContext);

// Authorized component for RBAC
const Authorized = ({ permissions, children }: { permissions?: string; children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!permissions) return <>{children}</>;
  
  const hasPermission = user.permissions.includes(permissions);
  return hasPermission ? <>{children}</> : null;
};

// Theme context for dark/light mode
const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {}
});

const useTheme = () => useContext(ThemeContext);

// Sidebar component
function Sidebar({ currentSection, setCurrentSection }: { currentSection: string; setCurrentSection: (section: string) => void }) {
  const { user } = useAuth();
  
  const navItems = [
    { id: 'dashboard', title: 'Dashboard', icon: '📊', section: 'dashboard' },
    { id: 'items', title: 'Items', icon: '📦', section: 'items', permissions: 'sample.items.read' },
    { id: 'permissions', title: 'Permissions', icon: '🔐', section: 'permissions' },
  ];
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>📦 Sample Sandbox</h2>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Authorized key={item.id} permissions={item.permissions}>
            <button
              className={`nav-item ${currentSection === item.section ? 'active' : ''}`}
              onClick={() => setCurrentSection(item.section)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-title">{item.title}</span>
            </button>
          </Authorized>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div>👤 {user.username}</div>
          <div>🎭 {user.roles.join(', ')}</div>
        </div>
      </div>
    </div>
  );
}

// Header component
function Header() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className="header">
      <div className="header-left">
        <h1>Module Sandbox</h1>
      </div>
      <div className="header-right">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}

// Dashboard section with stats cards
function DashboardSection() {
  const [stats, setStats] = useState({ totalItems: 0, apiHealth: 'Unknown' });
  
  useEffect(() => {
    // Load items count
    fetch('/api/plugins/<module-id>/items')
      .then(r => r.json())
      .then(items => setStats(prev => ({ ...prev, totalItems: items.length })))
      .catch(() => {});
      
    // Check API health
    fetch('/api/plugins/sample/health')
      .then(r => r.json())
      .then(() => setStats(prev => ({ ...prev, apiHealth: 'Healthy' })))
      .catch(() => setStats(prev => ({ ...prev, apiHealth: 'Error' })));
  }, []);
  
  return (
    <div className="section">
      <div className="section-header">
        <h2>📊 Dashboard</h2>
        <p>Overview of your module sandbox environment</p>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>{stats.totalItems}</h3>
            <p>Total Items</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔐</div>
          <div className="stat-content">
            <h3>4</h3>
            <p>Permissions</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <h3>Active</h3>
            <p>Status</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔗</div>
          <div className="stat-content">
            <h3>
              <a href="/api/plugins/sample/health" target="_blank" rel="noopener noreferrer">
                {stats.apiHealth}
              </a>
            </h3>
            <p>API Health</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Items management section
function ItemsSection() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const loadItems = async () => {
    try {
      const r = await fetch('/api/plugins/sample/items');
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load items:', error);
      setItems([]);
    }
  };
  
  const addItem = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      await fetch('/api/plugins/sample/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      setName('');
      await loadItems();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { loadItems(); }, []);
  
  return (
    <div className="section">
      <div className="section-header">
        <h2>📦 Items Management</h2>
        <p>Manage items with RBAC enforcement</p>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3>➕ Add New Item</h3>
          <p>Create a new item (requires create permission)</p>
        </div>
        <div className="card-content">
          <Authorized permissions="sample.items.create">
            <div className="form-group">
              <input
                type="text"
                placeholder="Enter item name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className="input"
              />
              <button 
                onClick={addItem} 
                disabled={loading || !name.trim()}
                className="button primary"
              >
                {loading ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </Authorized>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3>📋 Items List</h3>
          <p>All items in tenant-isolated database</p>
        </div>
        <div className="card-content">
          {items.length === 0 ? (
            <p className="empty-state">No items found. Add some items to get started.</p>
          ) : (
            <div className="items-list">
              {items.map((item) => (
                <div key={item.id} className="item-row">
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">
                      Created: {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="item-id">ID: {item.id.slice(0, 8)}...</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Permissions section
function PermissionsSection() {
  const { user } = useAuth();
  
  return (
    <div className="section">
      <div className="section-header">
        <h2>🔐 Permissions</h2>
        <p>RBAC permissions and testing for this module</p>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3>Current User Permissions</h3>
          <p>Permissions assigned to '{user.username}' in sandbox</p>
        </div>
        <div className="card-content">
          <div className="permissions-list">
            {user.permissions.map((permission) => (
              <div key={permission} className="permission-item">
                <span className="permission-code">{permission}</span>
                <span className="permission-status granted">✓ Granted</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h3>RBAC Testing</h3>
          <p>Test how UI responds to different permission states</p>
        </div>
        <div className="card-content">
          <div className="rbac-tests">
            <div className="test-case">
              <h4>Items Create Permission:</h4>
              <Authorized permissions="sample.items.create">
                <span className="test-result success">✓ Add Item Button Visible</span>
              </Authorized>
            </div>
            
            <div className="test-case">
              <h4>Items Read Permission:</h4>
              <Authorized permissions="sample.items.read">
                <span className="test-result success">✓ Items List Visible</span>
              </Authorized>
            </div>
            
            <div className="test-case">
              <h4>Non-existent Permission:</h4>
              <Authorized permissions="sample.admin">
                <span className="test-result error">❌ Should Not See This</span>
              </Authorized>
              <span className="test-result success">✓ Hidden (as expected)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App component
function App() {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  const renderSection = () => {
    switch (currentSection) {
      case 'items': return <ItemsSection />;
      case 'permissions': return <PermissionsSection />;
      default: return <DashboardSection />;
    }
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthContext.Provider value={{
        user: {
          username: 'dev',
          roles: ['OWNER'], 
          permissions: [
            'sample.items.read',
            'sample.items.create',
            'sample.items.update', 
            'sample.items.delete'
          ]
        }
      }}>
        <div className="app">
          <Sidebar currentSection={currentSection} setCurrentSection={setCurrentSection} />
          <div className="main-content">
            <Header />
            <main className="content">
              {renderSection()}
            </main>
          </div>
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);