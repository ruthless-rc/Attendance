import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Percent,
  Camera,
  UserPlus,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { dashboardService } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await dashboardService.getStatistics();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard statistics:", err);
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh dashboard stats every 15 seconds
    const interval = setInterval(() => loadData(), 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span>Loading analytics dashboard...</span>
        </div>
      </div>
    );
  }

  const summary = stats?.summary || {
    total_users: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
    attendance_rate: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header with Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Dashboard Overview
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric attendance metrics, trends, and recent check-ins
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/users/register"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5 text-brand-400" />
            <span>Add User</span>
          </Link>
          <Link
            to="/kiosk"
            target="_blank"
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition-all shadow-lg shadow-brand-600/25"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Live Kiosk</span>
          </Link>
        </div>
      </div>

      {/* Top 5 Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Users"
          value={summary.total_users}
          subtitle="Enrolled"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Present Today"
          value={summary.present_today}
          subtitle="Checked in"
          icon={UserCheck}
          color="emerald"
        />
        <StatCard
          title="Absent Today"
          value={summary.absent_today}
          subtitle="Not checked in"
          icon={UserX}
          color="rose"
        />
        <StatCard
          title="Late Arrivals"
          value={summary.late_today}
          subtitle="After cutoff"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Attendance Rate"
          value={`${summary.attendance_rate}%`}
          subtitle="Overall today"
          icon={Percent}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 7-Day Trend Chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Daily Attendance Trend (Last 7 Days)</h3>
            <p className="text-xs text-slate-400">Comparison of present, late, and absent records</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.daily_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" />
                <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorLate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Check-In Distribution */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Peak Arrival Distribution (Today)</h3>
            <p className="text-xs text-slate-400">Hourly check-in volume throughout operating hours</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.hourly_distributions || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Check-ins" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Attendance Breakdown & Recent Check-ins */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Department Stats */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm lg:col-span-1">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Department Attendance</h3>
            <p className="text-xs text-slate-400">Attendance percentages by department</p>
          </div>
          <div className="space-y-3.5">
            {stats?.department_breakdowns?.length > 0 ? (
              stats.department_breakdowns.map((dept) => (
                <div key={dept.department} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-200">{dept.department}</span>
                    <span className="text-slate-400 font-mono">
                      {dept.present}/{dept.total_users} ({dept.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No departments registered yet.</p>
            )}
          </div>
        </div>

        {/* Live Recent Check-Ins Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Check-Ins</h3>
              <p className="text-xs text-slate-400">Latest 10 biometric attendance recordings</p>
            </div>
            <Link
              to="/attendance"
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              View Full Logs →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Confidence</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stats?.recent_attendances?.length > 0 ? (
                  stats.recent_attendances.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5">
                        <div className="font-medium text-slate-100">{rec.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{rec.unique_id}</div>
                      </td>
                      <td className="py-2.5 text-slate-300">{rec.department || 'General'}</td>
                      <td className="py-2.5 font-mono text-slate-300">{rec.time}</td>
                      <td className="py-2.5 font-mono text-emerald-400">
                        {rec.confidence ? `${(rec.confidence * 100).toFixed(1)}%` : 'Manual'}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          variant={
                            rec.status === 'present'
                              ? 'success'
                              : rec.status === 'late'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {rec.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      No attendance marked yet today. Open the Kiosk to begin checking in.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
