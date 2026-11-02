import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/query-client';
import { BrowserRouter, Routes, Route, Link, Navigate, NavLink } from 'react-router-dom';
import { TournamentsPage } from './pages/TournamentsPage';
import { TeamsPage } from './pages/TeamsPage';
import { PlayersPage } from './pages/PlayersPage';
import { MatchesPage } from './pages/MatchesPage';
import { HeroesPage } from './pages/HeroesPage';
import { ControlPage } from './pages/ControlPage';
import { MonitorPage } from './pages/MonitorPage';
import { ObsPage } from './pages/ObsPage';
import { AssetsPage } from './pages/AssetsPage';
import { TemplateStudioPage } from './pages/TemplateStudioPage';
import { OVERLAY_ROUTES, OverlayApp } from './overlay/OverlayApp';

const NAV = [
  { to: '/dashboard/tournaments', label: 'Tournaments' },
  { to: '/dashboard/teams', label: 'Teams' },
  { to: '/dashboard/players', label: 'Players' },
  { to: '/dashboard/matches', label: 'Matches' },
  { to: '/dashboard/heroes', label: 'Hero Library' },
  { to: '/dashboard/assets', label: 'Asset Library' },
  { to: '/dashboard/control', label: 'Graphics Control' },
  { to: '/dashboard/templates', label: 'Template Studio' },
  { to: '/dashboard/obs', label: 'OBS Integration' },
];

function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-400">ARENA GRAPHICS</h1>
          <Link
            to="/monitor"
            target="_blank"
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-300 hover:bg-gray-800"
          >
            Monitor ↗
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-gray-800 bg-gray-900 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-2 transition-colors ${
                    isActive ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-gray-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-4 mt-4 border-t border-gray-800">
              <div className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                Overlays
              </div>
              {Object.entries(OVERLAY_ROUTES).map(([kind, route]) => (
                <Link
                  key={kind}
                  to={route}
                  target="_blank"
                  className="block rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800"
                >
                  {kind} ↗
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard/tournaments" replace />} />
            <Route path="/dashboard/tournaments" element={<TournamentsPage />} />
            <Route path="/dashboard/teams" element={<TeamsPage />} />
            <Route path="/dashboard/players" element={<PlayersPage />} />
            <Route path="/dashboard/matches" element={<MatchesPage />} />
            <Route path="/dashboard/heroes" element={<HeroesPage />} />
            <Route path="/dashboard/assets" element={<AssetsPage />} />
            <Route path="/dashboard/control" element={<ControlPage />} />
            <Route path="/dashboard/templates" element={<TemplateStudioPage />} />
            <Route path="/dashboard/obs" element={<ObsPage />} />
            <Route path="*" element={<Navigate to="/dashboard/tournaments" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/overlay/:kind" element={<OverlayApp />} />
          <Route path="/monitor" element={<MonitorPage />} />
          <Route path="/*" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
