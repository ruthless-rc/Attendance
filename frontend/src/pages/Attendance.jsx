import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  PlusCircle,
  Filter,
  Trash2,
  RefreshCw,
  UserX,
  UserCheck
} from 'lucide-react';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { attendanceService, userService } from '../services/api';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'today_roster'

  // Today Roster
  const [todayRoster, setTodayRoster] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Manual Attendance Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [manualForm, setManualForm] = useState({
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].slice(0, 8),
    status: 'present',
    notes: 'Admin manual entry'
  });
  const [manualError, setManualError] = useState('');

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (department) params.department = department;
      if (statusFilter) params.status_filter = statusFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [attData, todayData, usersList] = await Promise.all([
        attendanceService.getAttendance(params),
        attendanceService.getToday(),
        userService.getUsers({ limit: 300 })
      ]);
      setRecords(attData);
      setTodayRoster(todayData);
      setAllUsers(usersList);
      if (usersList.length > 0 && !manualForm.user_id) {
        setManualForm((prev) => ({ ...prev, user_id: String(usersList[0].id) }));
      }
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [department, statusFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAttendance();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualError('');
    try {
      await attendanceService.manualMark({
        ...manualForm,
        user_id: parseInt(manualForm.user_id, 10),
      });
      setIsManualModalOpen(false);
      loadAttendance();
    } catch (err) {
      setManualError(err.response?.data?.detail || "Failed to manually mark attendance.");
    }
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm("Are you sure you want to delete this attendance record?")) {
      try {
        await attendanceService.deleteRecord(id);
        loadAttendance();
      } catch (err) {
        alert("Failed to delete record.");
      }
    }
  };

  // Export handlers
  const handleExport = (type) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (department) params.append('department', department);
    if (statusFilter) params.append('status_filter', statusFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const url = `/api/attendance/export/${type}?${params.toString()}`;
    window.open(url, '_blank');
  };

  const departments = Array.from(new Set(allUsers.map((u) => u.department || 'General'))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Attendance Records
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail of biometric recognitions, time stamps, confidence scores, and rosters
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-brand-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-rose-400" />
            <span>PDF Report</span>
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-500 transition-colors shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Tabs: All Records vs Today's Roster */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          All Attendance Logs ({records.length})
        </button>
        <button
          onClick={() => setActiveTab('today_roster')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'today_roster'
              ? 'border-brand-500 text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Today's Live Roster (Present: {todayRoster?.present_count || 0} | Absent: {todayRoster?.absent_count || 0})
        </button>
      </div>

      {activeTab === 'all' ? (
        <>
          {/* Filters Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search user name or ID..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </form>

              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                    <th className="px-5 py-3.5 font-semibold">Date & Time</th>
                    <th className="px-5 py-3.5 font-semibold">User ID</th>
                    <th className="px-5 py-3.5 font-semibold">Full Name</th>
                    <th className="px-5 py-3.5 font-semibold">Department</th>
                    <th className="px-5 py-3.5 font-semibold">Confidence</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Method</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                          Loading attendance records...
                        </div>
                      </td>
                    </tr>
                  ) : records.length > 0 ? (
                    records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-200">{r.date}</div>
                          <div className="font-mono text-[10px] text-slate-400">{r.time}</div>
                        </td>
                        <td className="px-5 py-3.5 font-mono font-semibold text-brand-400">
                          {r.user?.unique_id || 'N/A'}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-100">
                          {r.user?.full_name || 'Unknown'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-300">
                          {r.user?.department || 'General'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-emerald-400">
                          {r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : 'Manual'}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant={
                              r.status === 'present'
                                ? 'success'
                                : r.status === 'late'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {r.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 capitalize">
                          {r.method.replace('_', ' ')}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleDeleteRecord(r.id)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No attendance records found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Today's Roster (Present vs Absent) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Present Today */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2 mb-4 text-emerald-400 font-semibold text-sm">
              <UserCheck className="h-5 w-5" />
              <span>Present Today ({todayRoster?.present_records?.length || 0})</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {todayRoster?.present_records?.length > 0 ? (
                todayRoster.present_records.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-100">{r.user?.full_name}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {r.user?.unique_id} • {r.user?.department}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold text-emerald-400">{r.time}</span>
                      <div className="text-[10px] text-slate-400 uppercase">{r.status}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">No one checked in yet today.</p>
              )}
            </div>
          </div>

          {/* Absent Today */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center gap-2 mb-4 text-rose-400 font-semibold text-sm">
              <UserX className="h-5 w-5" />
              <span>Absent Today ({todayRoster?.absent_users?.length || 0})</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {todayRoster?.absent_users?.length > 0 ? (
                todayRoster.absent_users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-100">{u.full_name}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {u.unique_id} • {u.department}
                      </div>
                    </div>
                    <Badge variant="danger">ABSENT</Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">All registered members are present today!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Attendance Entry */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Manual Attendance Override"
      >
        {manualError && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            {manualError}
          </div>
        )}
        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select User *
            </label>
            <select
              value={manualForm.user_id}
              onChange={(e) => setManualForm({ ...manualForm, user_id: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.unique_id}) - {u.department}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Time (HH:MM:SS) *
              </label>
              <input
                type="text"
                required
                value={manualForm.time}
                onChange={(e) => setManualForm({ ...manualForm, time: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Status *
            </label>
            <select
              value={manualForm.status}
              onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Reason / Notes
            </label>
            <input
              type="text"
              value={manualForm.notes}
              onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
              placeholder="e.g. Official Duty / System Override"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-500 transition-colors shadow-sm"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Attendance;
