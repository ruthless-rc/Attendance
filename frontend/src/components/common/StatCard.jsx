import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
  const colorMap = {
    blue: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/20',
    purple: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20',
  };

  const iconBgMap = {
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-b p-5 bg-slate-900/60 backdrop-blur-sm ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`rounded-lg p-2.5 ${iconBgMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">
          {value}
        </span>
        {subtitle && (
          <span className="text-xs text-slate-400">
            {subtitle}
          </span>
        )}
      </div>
      {trend && (
        <div className="mt-3 text-xs text-slate-400">
          {trend}
        </div>
      )}
    </div>
  );
};

export default StatCard;
