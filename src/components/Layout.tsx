/*
    SPDX-License-Identifier: AGPL-3.0-or-later
    SPDX-FileCopyrightText: 2025 Shomy
*/

import { Outlet, NavLink } from 'react-router-dom';
import { Terminal, Grid, FileStack, Wrench } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

export function Layout() {
  const { toggleLogPanel } = useUIStore();

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Penumbra
          </h1>
          <p className="text-xs text-zinc-500 mt-1">MediaTek Flash Tool</p>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 p-4 space-y-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
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
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
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
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`
            }
          >
            <Wrench className="w-5 h-5" />
            <span className="font-medium">Tools</span>
          </NavLink>
        </div>

        {/* Log Panel Toggle (Bottom) */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={toggleLogPanel}
            className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100"
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
