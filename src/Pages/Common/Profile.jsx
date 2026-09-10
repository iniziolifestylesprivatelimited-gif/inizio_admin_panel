import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { FiUser, FiLock, FiSave, FiEdit2, FiHelpCircle, FiArrowLeft } from 'react-icons/fi';
import { api } from '../../api/axios';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || 'Admin User',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    supportNumber: '',
    supportEmail: ''
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/app-config');
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            supportNumber: response.data.supportNumber || '',
            supportEmail: response.data.supportEmail || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching app config:', error);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/app-config/update', {
        supportNumber: formData.supportNumber,
        supportEmail: formData.supportEmail
      });
      setIsEditing(false);
      alert('Profile and Support Configuration updated successfully!');
    } catch (error) {
      alert('Failed to update configuration: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="relative space-y-6 min-h-full z-0">


      {/* Header Section */}
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center p-2.5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl transition-all border border-slate-200/80 dark:border-white/10 shadow-xs cursor-pointer"
            title="Go Back"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Admin Profile</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage your account settings and preferences.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white/40 dark:bg-transparent backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-md dark:shadow-2xl shadow-slate-200/50 dark:shadow-black/50 rounded-3xl p-8 text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-slate-100/50 dark:from-white/5 to-transparent pointer-events-none"></div>
            <div className="w-24 h-24 rounded-full bg-linear-to-tr from-blue-500 to-blue-700 flex items-center justify-center !text-white font-bold text-4xl shadow-inner mb-4">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{formData.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{formData.email}</p>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-500/20">
              Administrator
            </span>
          </div>
        </div>

        {/* Profile Details & Security */}
        <div className="lg:col-span-2">
          <div className="bg-white/40 dark:bg-transparent backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-md dark:shadow-2xl shadow-slate-200/50 dark:shadow-black/50 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-b from-slate-100/50 dark:from-white/5 to-transparent pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 border-b border-slate-200/80 dark:border-white/10 pb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiUser className="text-blue-600 dark:text-blue-400" /> Personal Information
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center px-4 py-2 bg-slate-100 dark:bg-transparent text-slate-700 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 dark:hover:text-white rounded-xl transition-all shadow-xs text-sm font-bold border border-slate-200/80 dark:border-white/10 backdrop-blur-md cursor-pointer"
              >
                {isEditing ? 'Cancel Edit' : <><FiEdit2 className="mr-1.5" /> Edit Profile</>}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-black/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-inner backdrop-blur-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-black/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-inner backdrop-blur-md"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200/80 dark:border-white/10 pt-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                  <FiLock className="text-blue-600 dark:text-blue-400" /> Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-black/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 dark:placeholder-slate-500 shadow-inner backdrop-blur-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-black/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 dark:placeholder-slate-500 shadow-inner backdrop-blur-md"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 dark:border-white/10 pt-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                  <FiHelpCircle className="text-blue-600 dark:text-blue-400" /> App Support Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Support Number</label>
                    <input
                      type="text"
                      name="supportNumber"
                      value={formData.supportNumber}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-black/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 dark:placeholder-slate-500 shadow-inner backdrop-blur-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Support Email</label>
                    <input
                      type="email"
                      name="supportEmail"
                      value={formData.supportEmail}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="e.g. support@inizio.in"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-black/40 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 dark:placeholder-slate-500 shadow-inner backdrop-blur-md"
                    />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="flex items-center justify-center px-6 py-2.5 text-white font-bold rounded-xl transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <FiSave className="mr-2" /> Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;