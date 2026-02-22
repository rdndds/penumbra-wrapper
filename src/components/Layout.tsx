/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

import { Outlet, NavLink } from 'react-router-dom';
import { Terminal, Grid, FileStack, Wrench, Sun, Moon } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

export function Layout() {
  const toggleLogPanel = useUIStore((state) => state.toggleLogPanel);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-[var(--border)]">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Penumbra
          </h1>
          <p className="text-xs text-[var(--text-subtle)] mt-1">MediaTek Flash Tool</p>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 p-4 space-y-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
              }`
            }
          >
            <Grid className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </NavLink>

          <NavLink
            to="/flasher"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
              }`
            }
          >
            <FileStack className="w-5 h-5" />
            <span className="font-medium">Flasher</span>
          </NavLink>

          <NavLink
            to="/tools"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--text)]'
              }`
            }
          >
            <Wrench className="w-5 h-5" />
            <span className="font-medium">Tools</span>
          </NavLink>
        </div>

        {/* Log Panel Toggle (Bottom) */}
        <div className="p-4 border-t border-[var(--border)] space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span className="font-medium">
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
          <button
            onClick={toggleLogPanel}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--surface-alt)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
            title="Toggle logs"
          >
            <Terminal className="w-5 h-5" />
            <span className="font-medium">Logs</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
