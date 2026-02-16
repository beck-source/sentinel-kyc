import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customer Registry',
  '/alerts': 'AML Alert Queue',
  '/documents': 'Document Verification',
  '/cases': 'Case Management',
  '/reports': 'Reports & Analytics',
};

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Determine page title from current path
  const pathBase = '/' + (location.pathname.split('/')[1] || '');
  const title = pageTitles[pathBase] || pageTitles['/'] || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className="flex flex-col flex-1 min-h-screen transition-all duration-200 ease-out"
        style={{ marginLeft: collapsed ? 64 : 260 }}
      >
        <Header title={title} />
        <main className="flex-1 p-6 overflow-auto">
          <div
            className="animate-in fade-in duration-150"
            key={location.pathname}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
