import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Camera,
  Trash2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { userService } from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [faceFilter, setFaceFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    unique_id: '',
    full_name: '',
    email: '',
    department: 'Computer Science',
    status: 'active',
    consent_given: true,
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const navigate = useNavigate();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      if (faceFilter !== '') params.is_face_registered = faceFilter === 'true';

      const data = await userService.getUsers(params);
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [deptFilter, faceFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const created = await userService.createUser(formData);
      setIsAddModalOpen(false);
      setFormData({
        unique_id: '',
        full_name: '',
        email: '',
        department: 'Computer Science',
        status: 'active',
        consent_given: true,
      });
      loadUsers();
      // Ask to enroll face
      if (window.confirm(`User ${created.full_name} created successfully! Proceed to register face biometrics now?`)) {
        navigate(`/users/register?userId=${created.id}`);
      }
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to create user.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      await userService.updateUser(selectedUser.id, {
        full_name: selectedUser.full_name,
        email: selectedUser.email,
        department: selectedUser.department,
        status: selectedUser.status,
      });
      setIsEditModalOpen(false);
      loadUsers();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Failed to update user.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    try {
      await userService.deleteUser(selectedUser.id);
      setIsDeleteModalOpen(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete user.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteFace = async (user) => {
    if (window.confirm(`Purge facial biometric data for ${user.full_name}? The user profile will remain, but face check-in will be disabled until re-registered.`)) {
      try {
        await userService.deleteFace(user.id);
        loadUsers();
      } catch (err) {
        alert(err.response?.data?.detail || "Failed to purge biometric data.");
      }
    }
  };

  // Get unique departments for filter dropdown
  const departments = Array.from(new Set(users.map((u) => u.department || 'General'))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            User Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage organization members, biometric enrollment, and individual credentials
          </p>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 transition-all self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, enrollment ID, or email..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={faceFilter}
            onChange={(e) => setFaceFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Face Statuses</option>
            <option value="true">Face Registered (✓)</option>
            <option value="false">Face Missing (✗)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="px-5 py-3.5 font-semibold">User ID</th>
                <th className="px-5 py-3.5 font-semibold">Full Name</th>
                <th className="px-5 py-3.5 font-semibold">Email</th>
                <th className="px-5 py-3.5 font-semibold">Department</th>
                <th className="px-5 py-3.5 font-semibold">Face Biometric</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-brand-400">
                      {user.unique_id}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-100">
                      <Link
                        to={`/users/${user.id}`}
                        className="hover:text-brand-400 hover:underline flex items-center gap-1.5"
                      >
                        {user.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{user.email}</td>
                    <td className="px-5 py-3.5 text-slate-300">{user.department || 'General'}</td>
                    <td className="px-5 py-3.5">
                      {user.is_face_registered ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="success">✓ Enrolled</Badge>
                          <button
                            onClick={() => handleDeleteFace(user)}
                            className="text-slate-400 hover:text-rose-400 text-[10px] underline"
                            title="Purge Biometrics"
                          >
                            Purge
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">✗ Missing</Badge>
                          <Link
                            to={`/users/register?userId=${user.id}`}
                            className="text-brand-400 hover:text-brand-300 font-semibold text-[11px] flex items-center gap-1"
                          >
                            <Camera className="h-3 w-3" /> Enroll
                          </Link>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={user.status === 'active' ? 'info' : 'default'}>
                        {user.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/users/register?userId=${user.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-brand-400 transition-colors"
                          title="Register / Update Face"
                        >
                          <Camera className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/users/${user.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                          title="View Profile & Attendance History"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setFormError('');
                            setIsEditModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No users found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New User */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Organization Member"
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            {formError}
          </div>
        )}
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Rahul Patel"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Unique ID / Enrollment *
              </label>
              <input
                type="text"
                required
                value={formData.unique_id}
                onChange={(e) => setFormData({ ...formData, unique_id: e.target.value })}
                placeholder="e.g. STU001 or EMP102"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Department / Class
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Computer Science"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Official Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. rahul.patel@organization.edu"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Privacy Consent Checkbox */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 mt-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={formData.consent_given}
                onChange={(e) => setFormData({ ...formData, consent_given: e.target.checked })}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-0"
              />
              <span className="text-[11px] text-slate-400 leading-relaxed">
                I confirm this user has provided consent for biometric facial template processing for organizational attendance verification.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="rounded-xl bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit User */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Profile"
      >
        {selectedUser && (
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            {formError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                {formError}
              </div>
            )}
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Unique ID (Immutable)
              </label>
              <input
                type="text"
                disabled
                value={selectedUser.unique_id}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 text-slate-400 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={selectedUser.full_name}
                onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={selectedUser.email}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={selectedUser.department || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Account Status
                </label>
                <select
                  value={selectedUser.status}
                  onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-brand-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="rounded-xl bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-500 transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User Confirmation"
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400">
              <AlertTriangle className="h-6 w-6 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">
                  Are you sure you want to permanently delete {selectedUser.full_name} ({selectedUser.unique_id})?
                </p>
                <p className="mt-1 text-slate-400">
                  This action cannot be undone. All associated attendance records and biometric facial templates will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={formLoading}
                className="rounded-xl bg-rose-600 px-5 py-2 font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Users;
