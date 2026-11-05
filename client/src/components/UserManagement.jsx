import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Shield, User, Key, CheckCircle, 
  XCircle, Trash2, Edit3, ShieldAlert, AlertCircle 
} from 'lucide-react';

export function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Add User Form
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'STAFF'
  });

  // Edit User Form
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    role: 'STAFF',
    is_active: 1,
    new_password: ''
  });

  const getHeaders = () => {
    const token = localStorage.getItem('vyapar_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/users', { headers: getHeaders() });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUser.password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to create user');
        return;
      }

      setShowAddModal(false);
      setNewUser({ username: '', password: '', full_name: '', email: '', role: 'STAFF' });
      fetchUsers();
      alert(`✅ User @${data.username} created successfully!`);
    } catch (err) {
      alert('Error creating user: ' + err.message);
    }
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setEditFormData({
      full_name: u.full_name || '',
      email: u.email || '',
      role: u.role || 'STAFF',
      is_active: u.is_active ? 1 : 0,
      new_password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const payload = {
        full_name: editFormData.full_name,
        email: editFormData.email,
        role: editFormData.role,
        is_active: editFormData.is_active === 1
      };
      if (editFormData.new_password.trim()) {
        if (editFormData.new_password.trim().length < 6) {
          alert('Password must be at least 6 characters long.');
          return;
        }
        payload.password = editFormData.new_password.trim();
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update user');
        return;
      }

      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
      alert('User details updated successfully!');
    } catch (err) {
      alert('Error updating user: ' + err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    if (u.id === currentUser?.id) {
      alert('You cannot delete your own logged-in account.');
      return;
    }

    if (!confirm(`Are you sure you want to delete user @${u.username} (${u.full_name})? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete user');
        return;
      }
      fetchUsers();
      alert('User account deleted.');
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color="#A78BFA" /> User Management & Access Control
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Admin portal to manage team members, role assignments (Admin vs Staff), and permissions
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> + Add New Team Member
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: 20,
          color: '#F87171'
        }}>
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="card-panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Username</th>
                <th>Role & Access</th>
                <th>Account Status</th>
                <th>Registered On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading user accounts...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>No users found.</td></tr>
              ) : (
                users.map(u => {
                  const isCurrent = u.id === currentUser?.id;
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#fff' }}>
                          {u.full_name} {isCurrent && <span style={{ fontSize: '0.72rem', color: '#60A5FA' }}>(You)</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email || 'No email provided'}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#93C5FD' }}>
                          @{u.username}
                        </span>
                      </td>
                      <td>
                        {isAdmin ? (
                          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                            <Shield size={13} style={{ marginRight: 4 }} /> ADMINISTRATOR
                          </span>
                        ) : (
                          <span className="badge badge-primary">
                            <User size={13} style={{ marginRight: 4 }} /> BILLING STAFF
                          </span>
                        )}
                      </td>
                      <td>
                        {u.is_active ? (
                          <span className="badge badge-success">
                            <CheckCircle size={13} style={{ marginRight: 4 }} /> ACTIVE
                          </span>
                        ) : (
                          <span className="badge badge-danger">
                            <XCircle size={13} style={{ marginRight: 4 }} /> DEACTIVATED
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            title="Edit Role or Reset Password"
                            onClick={() => handleOpenEdit(u)}
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          {!isCurrent && (
                            <button 
                              className="btn btn-danger btn-sm"
                              title="Delete User"
                              onClick={() => handleDeleteUser(u)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD NEW USER */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Add New Team User</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="e.g. Rahul Sharma"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Username *</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      placeholder="e.g. rahul"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password * (Min 6 chars)</label>
                    <input 
                      type="password" 
                      required 
                      className="form-input" 
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Email Address (Optional)</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="rahul@company.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Role *</label>
                    <select 
                      className="form-select"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="STAFF">Billing Staff</option>
                      <option value="ADMIN">Administrator (Full Access)</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  💡 <strong>Billing Staff</strong> can create sales invoices, enter purchases, and view inventory. <strong>Administrators</strong> have full access to business settings and user management.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {showEditModal && editingUser && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                Edit User: @{editingUser.username}
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select 
                      className="form-select"
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    >
                      <option value="STAFF">Billing Staff</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <select 
                    className="form-select"
                    value={editFormData.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: parseInt(e.target.value) })}
                  >
                    <option value={1}>Active (Can Log In)</option>
                    <option value={0}>Deactivated (Login Blocked)</option>
                  </select>
                </div>

                <div className="form-group" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                  <label className="form-label">Reset Password (Leave blank to keep current password)</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Enter new password (min 6 chars)"
                    value={editFormData.new_password}
                    onChange={(e) => setEditFormData({ ...editFormData, new_password: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
