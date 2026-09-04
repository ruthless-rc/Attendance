import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, MonitorPlay, ShieldCheck, UserCheck } from 'lucide-react';

const Navbar = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur-md">
      {/* Left title & badge */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-md shadow-brand-500/20">
          <UserCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white md:text-base">
            Face Recognition Attendance System
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block">
            Biometric Edge AI Attendance & Management
          </p>
        </div>
      </div>

      {/* Center Live Clock */}
      <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-1.5 shadow-inner">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="text-xs text-slate-400 font-medium">{dateStr}</span>
        <span className="text-xs text-slate-500">•</span>
        <span className="text-xs font-mono font-bold text-brand-400">{timeStr}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <Link
          to="/kiosk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-brand-500/40 bg-brand-600/20 px-3.5 py-1.5 text-xs font-semibold text-brand-300 hover:bg-brand-600/30 hover:border-brand-500 transition-all shadow-sm"
          title="Open Kiosk in Fullscreen"
        >
          <MonitorPlay className="h-4 w-4" />
          <span className="hidden sm:inline">Launch Kiosk</span>
        </Link>

        {admin && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{admin.username}</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                <ShieldCheck className="h-3 w-3 text-emerald-400" /> Admin
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
