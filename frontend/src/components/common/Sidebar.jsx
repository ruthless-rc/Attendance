import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  Camera,
  Settings,
  ShieldAlert
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Attendance Records', path: '/attendance', icon: CalendarCheck },
  { name: 'Users Directory', path: '/users', icon: Users },
  { name: 'Register New User', path: '/users/register', icon: UserPlus },
  { name: 'Attendance Kiosk', path: '/kiosk', icon: Camera },
  { name: 'System Settings', path: '/settings', icon: Settings },
];

const Sidebar = () => {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/90 flex flex-col justify-between hidden md:flex">
      <div className="p-4 space-y-6">
        <div className="px-3 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </p>
        </div>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Biometric Security notice in sidebar footer */}
      <div className="p-4 m-4 rounded-xl border border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 mb-1">
          <ShieldAlert className="h-4 w-4" />
          <span>Biometric Protection</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Embeddings stored in 128D mathematical vectors. Raw images are not retained.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
