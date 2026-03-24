import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Users, Kanban, Sun, Moon, Zap } from 'lucide-react';
import { useDarkMode } from './hooks/useDarkMode';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import PipelinePage from './pages/PipelinePage';
import ChatPage from './pages/ChatPage';

function Sidebar() {
  const { dark, toggle } = useDarkMode();

  return (
    <aside className="w-[220px] shrink-0 flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold tracking-tight text-sidebar-foreground">Sales AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/leads">
          {({ isActive }) => (
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Leads
            </div>
          )}
        </NavLink>
        <NavLink to="/pipeline">
          {({ isActive }) => (
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <Kanban className="w-4 h-4 shrink-0" />
              Pipeline
            </div>
          )}
        </NavLink>
      </nav>

      {/* Dark mode toggle */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
          title={dark ? 'Modo claro' : 'Modo escuro'}
        >
          {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {dark ? 'Modo claro' : 'Modo escuro'}
        </button>
      </div>
    </aside>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/leads" replace />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/leads/:id/chat" element={<ChatPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
