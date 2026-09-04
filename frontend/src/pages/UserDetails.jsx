import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User,
  Camera,
  CalendarCheck,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import Badge from '../components/common/Badge';
import { userService, attendanceService } from '../services/api';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, historyData] = await Promise.all([
        userService.getUser(id),
        attendanceService.getUserHistory(id)
      ]);
      setUser(userData);
      setHistory(historyData);
    } catch (err) {
      console.error("Failed to load user profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDeleteFace = async () => {
    if (window.confirm("Purge facial biometric data for this user? They will not be able to mark attendance until re-enrolled.")) {
      try {
        await userService.deleteFace(id);
        loadData();
      } catch (err) {
        alert("Failed to purge biometric data.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span>Loading user profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12 space-y-3">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <p className="text-sm font-semibold text-white">User Not Found</p>
        <Link to="/users" className="text-xs text-brand-400 underline">
          Return to Users Directory
        </Link>
      </div>
    );
  }

  const presentCount = history.filter((h) => h.status === 'present').length;
  const lateCount = history.filter((h) => h.status === 'late').length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/users"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Users</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/users/register?userId=${user.id}`}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition-colors shadow-sm"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>{user.is_face_registered ? 'Re-enroll Face' : 'Enroll Face'}</span>
          </Link>
        </div>
      </div>

      {/* User Header Profile Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-xl font-bold text-white shadow-lg shadow-brand-500/20">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user.full_name}</h2>
              <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                {user.status.toUpperCase()}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="font-mono text-brand-400 font-semibold">{user.unique_id}</span>
              <span>•</span>
              <span>{user.email}</span>
              <span>•</span>
              <span>{user.department || 'General'}</span>
            </div>
          </div>
        </div>

        {/* Biometric Status Chip */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
          <div className={`p-2 rounded-lg ${user.is_face_registered ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="text-xs">
            <div className="font-semibold text-slate-200">
              {user.is_face_registered ? 'Face Enrolled (128D)' : 'Biometrics Missing'}
            </div>
            <div className="text-[10px] text-slate-400">
              {user.is_face_registered ? 'Eligible for Kiosk check-in' : 'Must enroll to mark attendance'}
            </div>
          </div>
          {user.is_face_registered && (
            <button
              onClick={handleDeleteFace}
              className="ml-2 rounded-lg p-1 text-slate-500 hover:text-rose-400 transition-colors"
              title="Purge biometric embedding"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Attendances</span>
          <div className="mt-2 text-2xl font-bold text-white">{history.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">On-Time (Present)</span>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{presentCount}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400 uppercase font-semibold">Late Arrivals</span>
          <div className="mt-2 text-2xl font-bold text-amber-400">{lateCount}</div>
        </div>
      </div>

      {/* Individual Attendance History Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-brand-400" />
          Attendance History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Time</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Confidence</th>
                <th className="pb-3 font-semibold">Method</th>
                <th className="pb-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.length > 0 ? (
                history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-semibold text-slate-200">{rec.date}</td>
                    <td className="py-3 font-mono text-slate-300">{rec.time}</td>
                    <td className="py-3">
                      <Badge variant={rec.status === 'present' ? 'success' : rec.status === 'late' ? 'warning' : 'default'}>
                        {rec.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 font-mono text-emerald-400">
                      {rec.confidence ? `${(rec.confidence * 100).toFixed(1)}%` : 'Manual'}
                    </td>
                    <td className="py-3 text-slate-400 capitalize">{rec.method.replace('_', ' ')}</td>
                    <td className="py-3 text-slate-400">{rec.notes || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No attendance records logged for this user yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
