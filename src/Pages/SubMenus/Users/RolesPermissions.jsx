import { useState, useEffect } from 'react';
import { api } from '../../../api/axios';
import { 
  FiCheck, FiLoader, FiAlertCircle, FiShield, FiUserPlus, 
  FiUsers, FiLayers, FiMapPin, FiSettings, FiCheckSquare, 
  FiPlus, FiX, FiCheckCircle, FiLock, FiUnlock, FiGrid, FiList
} from 'react-icons/fi';

const RolesPermissions = () => {
  // Tabs: 'CREATE_USER' or 'PERMISSIONS'
  const [activeTab, setActiveTab] = useState('CREATE_USER');
  
  // Roles list & Counts
  const [rolesList, setRolesList] = useState([]);
  const [roleCounts, setRoleCounts] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(true);

  // User Creation State
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'sales_head',
    statesInput: '',
    territoriesInput: '',
    salesHead: ''
  });
  const [salesHeads, setSalesHeads] = useState([]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');
  const [createErrorMsg, setCreateErrorMsg] = useState('');

  // Permissions & Audit Logs State
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [roleMappings, setRoleMappings] = useState([]);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState('billing');
  const [roleActivePermissions, setRoleActivePermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsErrorMsg, setPermissionsErrorMsg] = useState('');
  const [permissionsSuccessMsg, setPermissionsSuccessMsg] = useState('');

  // Live API Tester State
  const [activeApiTest, setActiveApiTest] = useState(null);
  const [apiTestResponse, setApiTestResponse] = useState(null);
  const [testingApi, setTestingApi] = useState(false);
  const [apiTestError, setApiTestError] = useState('');

  // Live Role Users & Detailed Profile State
  const [selectedRoleForUsers, setSelectedRoleForUsers] = useState(null);
  const [roleUsersList, setRoleUsersList] = useState([]);
  const [loadingRoleUsers, setLoadingRoleUsers] = useState(false);
  const [selectedDetailedUser, setSelectedDetailedUser] = useState(null);
  const [detailedUserInfo, setDetailedUserInfo] = useState(null);
  const [loadingDetailedUser, setLoadingDetailedUser] = useState(false);

  // General Loading & Token
  const token = sessionStorage.getItem('accessToken');
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch Roles and Permissions data
  const fetchRolesData = async () => {
    setLoadingRoles(true);
    try {
      const res = await api.get('/admin/users/roles', { headers });
      if (res.data?.success) {
        setRolesList(res.data.roles || []);
        setRoleCounts(res.data.roleCounts || {});
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchPermissionsData = async () => {
    setLoadingPermissions(true);
    try {
      const res = await api.get('/admin/permissions', { headers });
      // The API returns role mapping logs and available permission keys
      // Usually format: { success: true, permissions: [...], mappings: [...], availablePermissions: [...] }
      // We will parse it and fallback to safe defaults.
      const data = res.data || {};
      
      const availPerms = data.availablePermissions || data.permissions || [
        'orders_view', 'orders_manage', 'customers_view', 'customers_manage',
        'ledgers_manage', 'invoices_upload', 'banners_manage', 'notifications_send',
        'chat_view', 'chat_respond', 'campaigns_view', 'campaigns_manage',
        'products_view', 'products_manage'
      ];
      setAvailablePermissions(availPerms);

      const mappings = data.mappings || data.roleMappings || data.logs || [];
      setRoleMappings(mappings);

      // Find currently selected role's permissions
      // If mappings contains an object for this role, set it
      const currentRoleMapping = mappings.find(m => m.role === selectedRoleForPermissions);
      if (currentRoleMapping) {
        setRoleActivePermissions(currentRoleMapping.permissions || []);
      } else {
        setRoleActivePermissions([]);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setPermissionsErrorMsg('Failed to load permissions configuration.');
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Fetch sales heads to select in TSM reporting
  const fetchSalesHeadsList = async () => {
    try {
      const res = await api.get('/admin/users?role=sales_head', { headers });
      const allUsers = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.users || res.data?.customers || []);
      // Filter by role === 'sales_head'
      const shUsers = allUsers.filter(u => u.role === 'sales_head' || u.role === 'salesHead');
      setSalesHeads(shUsers);
    } catch (err) {
      console.error('Error fetching sales heads list:', err);
    }
  };

  useEffect(() => {
    fetchRolesData();
    fetchSalesHeadsList();
  }, []);

  useEffect(() => {
    if (activeTab === 'PERMISSIONS') {
      fetchPermissionsData();
    }
  }, [activeTab, selectedRoleForPermissions]);

  // Handle Form Input Changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setCreateUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // User Registration submit
  const handleRegisterUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateSuccessMsg('');
    setCreateErrorMsg('');

    const payload = {
      name: createUserForm.name,
      email: createUserForm.email,
      phone: createUserForm.phone,
      password: createUserForm.password,
      role: createUserForm.role
    };

    // Conditional payloads based on role
    if (createUserForm.role === 'sales_head') {
      payload.states = createUserForm.statesInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '');
    } else if (createUserForm.role === 'tsm') {
      payload.territories = createUserForm.territoriesInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t !== '');
      payload.salesHead = createUserForm.salesHead;
      
      if (!payload.salesHead) {
        setCreateErrorMsg('Reporting Sales Head is required for TSM role.');
        setCreatingUser(false);
        return;
      }
    }

    try {
      const res = await api.post('/admin/users/create', payload, { headers });
      if (res.data?.success || res.status === 200 || res.status === 201) {
        setCreateSuccessMsg(`User Registered Successfully with role: ${createUserForm.role.replace('_', ' ').toUpperCase()}`);
        setCreateUserForm({
          name: '',
          email: '',
          phone: '',
          password: '',
          role: 'sales_head',
          statesInput: '',
          territoriesInput: '',
          salesHead: ''
        });
        fetchRolesData(); // refresh counts
      } else {
        setCreateErrorMsg(res.data?.message || 'Failed to create user.');
      }
    } catch (err) {
      console.error('Create user error:', err);
      setCreateErrorMsg(err.response?.data?.message || 'Error occurred while creating user. Please try again.');
    } finally {
      setCreatingUser(false);
    }
  };

  // Permissions checkbox toggle
  const handleTogglePermission = (perm) => {
    setRoleActivePermissions(prev => {
      if (prev.includes(perm)) {
        return prev.filter(p => p !== perm);
      } else {
        return [...prev, perm];
      }
    });
  };

  // Permissions submit
  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    setPermissionsSuccessMsg('');
    setPermissionsErrorMsg('');

    try {
      const payload = {
        role: selectedRoleForPermissions,
        permissions: roleActivePermissions
      };
      const res = await api.put('/admin/permissions', payload, { headers });
      if (res.data?.success || res.status === 200) {
        setPermissionsSuccessMsg(`Permissions for role "${selectedRoleForPermissions}" updated successfully.`);
        fetchPermissionsData(); // Refresh list to get updated mappings and logs
      } else {
        setPermissionsErrorMsg(res.data?.message || 'Failed to update permissions.');
      }
    } catch (err) {
      console.error('Update permissions error:', err);
      setPermissionsErrorMsg(err.response?.data?.message || 'Error occurred while updating permissions.');
    } finally {
      setSavingPermissions(false);
    }
  };

  const getRoleApiEndpoints = (role) => {
    switch (role) {
      case 'admin':
        return [
          { method: 'GET', path: '/api/activity/stats', desc: 'Activity stats for logins, searches, and product views. Supports date ranges and trends.', params: ['startDate', 'endDate', 'breakdown=true', 'breakdownInterval=day/month'] },
          { method: 'GET', path: '/api/admin/analytics', desc: 'Active cart counts, total cart items, and sales reports for Sales Heads and TSMs.', params: [] },
          { method: 'GET', path: '/api/admin/users', desc: 'List all registered staff, including manager hierarchies.', params: ['role=sales_head/tsm/billing/warehouse/customer'] },
          { method: 'GET', path: '/api/admin/users/:userId', desc: 'Complete profile of a specific user with device logs, territories, and active carts.', params: [] },
          { method: 'GET', path: '/api/admin/customers', desc: 'Profiles of all customers with KYC details, GST certificates, and app lock status.', params: ['stats=true'] }
        ];
      case 'sales_head':
        return [
          { method: 'GET', path: '/api/admin/analytics', desc: 'Cart conversion funnel and active cart logs for assigned state regions and TSMs.', params: [] },
          { method: 'GET', path: '/api/admin/users', desc: 'Lists only the TSMs assigned to this Sales Head with their territories.', params: [] },
          { method: 'GET', path: '/api/admin/users/:userId', desc: 'Detailed profile of an assigned TSM, listing all customers within their territory.', params: [] },
          { method: 'GET', path: '/api/admin/customers', desc: 'Details and metrics for all customers within the Sales Head’s state regions.', params: ['stats=true'] }
        ];
      case 'tsm':
        return [
          { method: 'GET', path: '/api/admin/analytics', desc: 'Conversion rates, active cart counts, and metrics for customers in assigned territories.', params: [] },
          { method: 'GET', path: '/api/admin/customers', desc: 'Details for all customers in assigned territories (KYC, GST number, phone, etc).', params: ['stats=true'] }
        ];
      default:
        return [
          { method: 'GET', path: '/api/admin/users/:userId', desc: 'Retrieves own user profile and hierarchy metadata.', params: [] }
        ];
    }
  };

  const handleTestApi = async (apiDoc) => {
    setTestingApi(true);
    setApiTestResponse(null);
    setApiTestError('');
    setActiveApiTest(apiDoc);

    try {
      const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      const userId = savedUser._id || savedUser.id || '';
      
      let path = apiDoc.path;
      // Strip /api if it exists since axios baseURL already has /api
      if (path.startsWith('/api/')) {
        path = path.substring(4);
      } else if (path.startsWith('/api')) {
        path = path.substring(4);
      }

      // Substitute userId parameter if present
      if (path.includes(':userId')) {
        path = path.replace(':userId', userId);
      }

      // Add default query parameters based on doc specs
      let queryParams = [];
      if (apiDoc.path === '/api/activity/stats') {
        queryParams.push('breakdown=true');
        queryParams.push('breakdownInterval=day');
      } else if (apiDoc.path === '/api/admin/users') {
        queryParams.push(`role=${selectedRoleForPermissions}`);
      } else if (apiDoc.path === '/api/admin/customers') {
        queryParams.push('stats=true');
      }

      const finalUrl = path + (queryParams.length > 0 ? `?${queryParams.join('&')}` : '');
      
      const res = await api.get(finalUrl, { headers });
      setApiTestResponse(res.data);
    } catch (err) {
      console.error('API Test error:', err);
      setApiTestError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to retrieve data from API.');
    } finally {
      setTestingApi(false);
    }
  };

  const handleSelectRoleForUsers = async (role) => {
    setSelectedRoleForUsers(role);
    setRoleUsersList([]);
    setSelectedDetailedUser(null);
    setDetailedUserInfo(null);
    setLoadingRoleUsers(true);
    try {
      const endpoint = role === 'customer' ? '/admin/customers' : `/admin/users?role=${role}`;
      const res = await api.get(endpoint, { headers });
      const users = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.users || res.data?.customers || []);
      setRoleUsersList(users);
    } catch (err) {
      console.error('Error fetching users for role:', err);
    } finally {
      setLoadingRoleUsers(false);
    }
  };

  const handleFetchDetailedUser = async (userId) => {
    setSelectedDetailedUser(userId);
    setDetailedUserInfo(null);
    if (selectedRoleForUsers === 'customer') {
      const customerInfo = roleUsersList.find(u => u._id === userId);
      if (customerInfo) {
        setDetailedUserInfo(customerInfo);
        return;
      }
    }
    setLoadingDetailedUser(true);
    try {
      const res = await api.get(`/admin/users/${userId}`, { headers });
      setDetailedUserInfo(res.data?.user || res.data);
    } catch (err) {
      console.error('Error fetching detailed user profile:', err);
    } finally {
      setLoadingDetailedUser(false);
    }
  };

  const getRoleLabel = (r) => {
    return r.replace('_', ' ').toUpperCase();
  };

  return (
    <div className="relative space-y-6 min-h-full z-0 isolate w-full pb-10">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-screen filter blur-[80px] opacity-40 pointer-events-none -z-10 transform-gpu"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[100px] opacity-40 pointer-events-none -z-10 transform-gpu"></div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FiShield className="text-blue-400" />
            Roles & Permissions
          </h1>
          <p className="text-slate-400 font-medium mt-1">Manage system roles, register operations staff and modify access control policies.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1 gap-1 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('CREATE_USER')}
            className={`flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'CREATE_USER'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/35 border border-blue-500/35'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FiUserPlus /> Register Staff
          </button>
          <button
            onClick={() => setActiveTab('PERMISSIONS')}
            className={`flex-1 md:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'PERMISSIONS'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/35 border border-blue-500/35'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FiShield /> Access Control
          </button>
        </div>
      </div>

      {/* Role Counts Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loadingRoles ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 animate-pulse h-24"></div>
          ))
        ) : (
          Object.keys(roleCounts).length > 0 ? (
            Object.entries(roleCounts).map(([role, count]) => {
              const isSelected = selectedRoleForUsers === role;
              return (
                <div 
                  key={role} 
                  onClick={() => handleSelectRoleForUsers(role)}
                  className={`bg-transparent backdrop-blur-2xl border shadow-lg rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative group hover:border-white/30 hover:bg-white/[0.02] cursor-pointer transition-all active:scale-95 ${
                    isSelected ? 'border-blue-500/50 bg-blue-500/[0.03] ring-1 ring-blue-500/30' : 'border-white/10'
                  }`}
                >
                  <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                      {role.replace('_', ' ')}
                    </span>
                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      <FiUsers size={12} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-white">{count}</span>
                    <span className="text-slate-500 text-[10px] font-bold">users</span>
                  </div>
                </div>
              );
            })
          ) : (
            ['admin', 'sales_head', 'tsm', 'billing', 'warehouse', 'customer'].map(role => {
              const isSelected = selectedRoleForUsers === role;
              return (
                <div 
                  key={role} 
                  onClick={() => handleSelectRoleForUsers(role)}
                  className={`bg-transparent backdrop-blur-2xl border shadow-lg rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative hover:border-white/35 cursor-pointer transition-all active:scale-95 ${
                    isSelected ? 'border-blue-500/50 bg-blue-500/[0.03] ring-1 ring-blue-500/30' : 'border-white/10'
                  }`}
                >
                  <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                      {role.replace('_', ' ')}
                    </span>
                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'
                    }`}>
                      <FiUsers size={12} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-white">0</span>
                    <span className="text-slate-500 text-[10px] font-bold">users</span>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Selected Role Users & Profile Details */}
      {selectedRoleForUsers && (
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden relative p-6 space-y-6">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <FiUsers className="text-blue-400 text-xl" />
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">{selectedRoleForUsers.replace('_', ' ')} Accounts</h2>
                <p className="text-xs text-slate-400 font-medium">Select a user profile to retrieve detailed hierarchy and logs.</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSelectedRoleForUsers(null);
                setRoleUsersList([]);
                setSelectedDetailedUser(null);
                setDetailedUserInfo(null);
              }}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/15 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer border border-white/5"
            >
              Clear Panel
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Users List */}
            <div className="lg:col-span-1 border-r border-white/5 pr-0 lg:pr-6 space-y-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">User Registry ({roleUsersList.length})</span>
              
              {loadingRoleUsers ? (
                <div className="py-12 flex flex-col justify-center items-center gap-2">
                  <FiLoader className="animate-spin text-lg text-blue-400" />
                  <span className="text-xs text-slate-500 font-bold">Fetching user accounts...</span>
                </div>
              ) : roleUsersList.length === 0 ? (
                <div className="py-12 text-slate-500 italic text-xs text-center">
                  No active {selectedRoleForUsers.replace('_', ' ')} accounts found.
                </div>
              ) : (
                <div className="space-y-2 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
                  {roleUsersList.map(u => {
                    const isUserSelected = selectedDetailedUser === u._id;
                    return (
                      <div 
                        key={u._id}
                        onClick={() => handleFetchDetailedUser(u._id)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all active:scale-98 ${
                          isUserSelected 
                            ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-md' 
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-sm truncate">{u.name}</div>
                        <div className="text-xs text-slate-500 font-medium truncate font-mono mt-0.5">{u.email}</div>
                        {u.phone && <div className="text-[10px] text-slate-500 font-semibold font-mono mt-1">+{u.phone}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Detailed Profile View */}
            <div className="lg:col-span-2 space-y-4">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Profile & Hierarchy Details</span>

              {!selectedDetailedUser ? (
                <div className="h-64 flex flex-col justify-center items-center border border-dashed border-white/10 rounded-2xl text-slate-500 p-6 text-center">
                  <FiAlertCircle size={28} className="text-slate-600 mb-2" />
                  <span className="text-xs font-bold">Select a user account from the left list to fetch detailed profile information.</span>
                </div>
              ) : loadingDetailedUser ? (
                <div className="h-64 flex flex-col justify-center items-center">
                  <FiLoader className="animate-spin text-2xl text-blue-400 mb-2" />
                  <span className="text-xs text-slate-500 font-bold">Fetching user profile data from API...</span>
                </div>
              ) : detailedUserInfo ? (
                <div className="bg-black/25 border border-white/5 rounded-2xl p-5 space-y-5 text-left animate-in fade-in">
                  
                  {/* User Profile Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 font-black flex items-center justify-center text-lg shadow-inner">
                        {detailedUserInfo.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-white text-lg">{detailedUserInfo.name}</h3>
                          <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded uppercase shrink-0">
                            {detailedUserInfo.role || 'customer'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium font-mono mt-0.5">{detailedUserInfo.email}</p>
                      </div>
                    </div>
                    {detailedUserInfo.phone && (
                      <div className="text-xs text-slate-400 font-bold font-mono">
                        Phone: <span className="text-white">+{detailedUserInfo.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* States/Territories */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Territorial Scope</h4>
                      {detailedUserInfo.states && detailedUserInfo.states.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {detailedUserInfo.states.map(s => (
                            <span key={s} className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded-lg border border-white/5">{s}</span>
                          ))}
                        </div>
                      ) : detailedUserInfo.territories && detailedUserInfo.territories.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {detailedUserInfo.territories.map(t => (
                            <span key={t} className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded-lg border border-white/5">{t}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">No territorial states or boundaries assigned.</span>
                      )}
                    </div>

                    {/* Hierarchy Info */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Hierarchy & Reporting</h4>
                      {detailedUserInfo.salesHead ? (
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-1">
                          <div className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Reports To (Sales Head)</div>
                          <div className="font-extrabold text-white">{detailedUserInfo.salesHead.name || 'Sales Head'}</div>
                          <div className="text-slate-400 font-medium truncate font-mono text-[10px]">{detailedUserInfo.salesHead.email || ''}</div>
                        </div>
                      ) : detailedUserInfo.tsmCount !== undefined ? (
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-white">{detailedUserInfo.tsmCount}</span>
                          <span className="text-slate-500 text-xs font-bold">TSMs reporting to this Sales Head</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Direct staff or independent organization role.</span>
                      )}
                    </div>
                  </div>

                  {/* Device Platform Logs */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Device Registers</h4>
                    {detailedUserInfo.devices && detailedUserInfo.devices.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {detailedUserInfo.devices.map((dev, i) => (
                          <div key={i} className="p-3.5 bg-black/40 border border-white/5 rounded-xl space-y-2 text-xs relative overflow-hidden">
                            <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Device #{i+1}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                                dev.devicePlatform === 'ios' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                'bg-orange-500/10 text-orange-400 border-orange-500/20'
                              }`}>
                                {dev.devicePlatform || 'unknown'}
                              </span>
                            </div>
                            {dev.fcmToken && (
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider">FCM Push Token</span>
                                <div className="text-[9px] text-slate-400 font-mono break-all line-clamp-1 hover:line-clamp-none select-all cursor-pointer transition-all">{dev.fcmToken}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs italic block">No active device connections registered.</span>
                    )}
                  </div>

                  {/* Active Cart Items if present */}
                  {detailedUserInfo.cartItems && detailedUserInfo.cartItems.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Active Cart Items</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                        {detailedUserInfo.cartItems.map((cart, idx) => (
                          <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <div className="font-bold text-white">{cart.productName || 'Product'}</div>
                              {cart.variantName && <div className="text-[10px] text-slate-500 font-medium font-mono">{cart.variantName}</div>}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-extrabold text-blue-400">Qty: {cart.quantity || 1}</div>
                              {cart.price && <div className="text-[10px] text-slate-500 font-bold font-mono">₹{cart.price}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="h-64 flex flex-col justify-center items-center border border-dashed border-white/10 rounded-2xl text-slate-500 p-6 text-center">
                  <FiAlertCircle size={28} className="text-slate-600 mb-2" />
                  <span className="text-xs font-bold">Failed to load detailed profile. Please verify network status.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      {activeTab === 'CREATE_USER' && (
        <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden relative p-6">
          <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>
          
          <div className="max-w-2xl mx-auto">
            <div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
              <FiUserPlus className="text-blue-400 text-xl" />
              <div>
                <h2 className="text-lg font-bold text-white">Register Operations Staff</h2>
                <p className="text-xs text-slate-400 font-medium">Create user profiles with specialized internal roles.</p>
              </div>
            </div>

            {createSuccessMsg && (
              <div className="mb-5 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-bold flex items-center gap-3 animate-in fade-in">
                <FiCheckCircle size={18} />
                <span>{createSuccessMsg}</span>
              </div>
            )}

            {createErrorMsg && (
              <div className="mb-5 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex items-center gap-3 animate-in fade-in">
                <FiAlertCircle size={18} />
                <span>{createErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterUser} className="space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={createUserForm.name}
                    onChange={handleFormChange}
                    placeholder="Enter name"
                    className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Role Category</label>
                  <select
                    name="role"
                    value={createUserForm.role}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold"
                  >
                    <option value="sales_head">Sales Head</option>
                    <option value="tsm">Territory Sales Manager (TSM)</option>
                    <option value="billing">Billing Operator</option>
                    <option value="warehouse">Warehouse Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={createUserForm.email}
                    onChange={handleFormChange}
                    placeholder="name@inizio.in"
                    className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={createUserForm.phone}
                    onChange={handleFormChange}
                    placeholder="10 digit number"
                    className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={createUserForm.password}
                  onChange={handleFormChange}
                  placeholder="Set temporary secure password"
                  className="w-full px-4 py-2.5 bg-black/25 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold"
                />
              </div>

              {/* Conditional Fields based on Role selection */}
              {createUserForm.role === 'sales_head' && (
                <div className="space-y-1 bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1">
                    <FiMapPin className="text-blue-400 text-xs" />
                    <label className="text-xs font-black text-blue-400 uppercase tracking-wider block">Assigned States</label>
                  </div>
                  <input
                    type="text"
                    name="statesInput"
                    required
                    value={createUserForm.statesInput}
                    onChange={handleFormChange}
                    placeholder="Telangana, Andhra Pradesh, Maharashtra (Comma-separated)"
                    className="w-full px-4 py-2.5 bg-black/30 border border-blue-500/25 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">Specify all states this Sales Head will supervise.</span>
                </div>
              )}

              {createUserForm.role === 'tsm' && (
                <div className="space-y-4 bg-purple-500/5 border border-purple-500/10 p-4 rounded-2xl animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-purple-400 uppercase tracking-wider block">Reporting Sales Head</label>
                      <select
                        name="salesHead"
                        required
                        value={createUserForm.salesHead}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-purple-500/25 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold"
                      >
                        <option value="">-- Choose Sales Head --</option>
                        {salesHeads.length > 0 ? (
                          salesHeads.map(sh => (
                            <option key={sh._id} value={sh._id}>{sh.name} ({sh.email})</option>
                          ))
                        ) : (
                          <option value="" disabled>No active Sales Heads registered</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FiMapPin className="text-purple-400 text-xs" />
                        <label className="text-xs font-black text-purple-400 uppercase tracking-wider block">Assigned Territories</label>
                      </div>
                      <input
                        type="text"
                        name="territoriesInput"
                        required
                        value={createUserForm.territoriesInput}
                        onChange={handleFormChange}
                        placeholder="Hyderabad, Secunderabad, Warangal"
                        className="w-full px-4 py-2.5 bg-black/30 border border-purple-500/25 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold block">Specify the reporting supervisor and comma-separated territories assigning to this TSM.</span>
                </div>
              )}

              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/35 border border-blue-500/35"
                >
                  {creatingUser ? (
                    <>
                      <FiLoader className="animate-spin text-sm" /> Creating User...
                    </>
                  ) : (
                    <>
                      <FiPlus /> Register User Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'PERMISSIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Role Selector & Permissions Form */}
          <div className="lg:col-span-2 bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden relative p-6 space-y-6">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <FiLock className="text-amber-400 text-xl" />
                <div>
                  <h2 className="text-lg font-bold text-white">Access Control Settings</h2>
                  <p className="text-xs text-slate-400 font-medium">Assign specific endpoint permissions to each user role.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Role:</span>
                <select
                  value={selectedRoleForPermissions}
                  onChange={(e) => setSelectedRoleForPermissions(e.target.value)}
                  className="w-full sm:w-48 px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="admin">Administrator</option>
                  <option value="sales_head">Sales Head</option>
                  <option value="tsm">TSM</option>
                  <option value="billing">Billing Operator</option>
                  <option value="warehouse">Warehouse Manager</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
            </div>

            {permissionsSuccessMsg && (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-bold flex items-center gap-3 animate-in fade-in">
                <FiCheckCircle size={18} />
                <span>{permissionsSuccessMsg}</span>
              </div>
            )}

            {permissionsErrorMsg && (
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex items-center gap-3 animate-in fade-in">
                <FiAlertCircle size={18} />
                <span>{permissionsErrorMsg}</span>
              </div>
            )}

            {loadingPermissions ? (
              <div className="h-64 flex flex-col justify-center items-center">
                <FiLoader className="animate-spin text-2xl text-blue-400 mb-2" />
                <p className="text-xs text-slate-500 font-bold">Loading permissions mapping...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availablePermissions.map(perm => {
                    const isChecked = roleActivePermissions.includes(perm);
                    return (
                      <div 
                        key={perm}
                        onClick={() => handleTogglePermission(perm)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isChecked 
                            ? 'bg-blue-600/15 border-blue-500/40 text-white' 
                            : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex flex-col text-left">
                          <code className="text-xs font-mono font-bold">{perm}</code>
                          <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">
                            {perm.replace('_', ' ')} Access
                          </span>
                        </div>

                        <div className={`w-8 h-5 rounded-full p-0.5 transition-colors relative flex items-center shrink-0 ${isChecked ? 'bg-blue-500' : 'bg-slate-800'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isChecked ? 'translate-x-3' : 'translate-x-0'}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <button
                    onClick={handleSavePermissions}
                    disabled={savingPermissions}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/35 border border-blue-500/35"
                  >
                    {savingPermissions ? (
                      <>
                        <FiLoader className="animate-spin text-sm" /> Saving...
                      </>
                    ) : (
                      <>
                        <FiLock /> Save Policy Updates
                      </>
                    )}
                  </button>
                </div>

                {/* API Scope Reference Section */}
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <FiLayers className="text-blue-400 text-base" />
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Authorized API Endpoints Reference</h3>
                      <p className="text-[10px] text-slate-400 font-medium">HTTP routes accessible under this role's default policy.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {getRoleApiEndpoints(selectedRoleForPermissions).map((api, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-black/25 border border-white/5 hover:border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                              api.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              api.method === 'POST' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {api.method}
                            </span>
                            <code className="text-xs font-bold text-blue-300 font-mono break-all">{api.path}</code>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{api.desc}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          {api.params.length > 0 && (
                            <div className="flex flex-col gap-1 items-end">
                              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Params</span>
                              <div className="flex flex-wrap gap-1 justify-end">
                                {api.params.map(p => (
                                  <code key={p} className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">{p}</code>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => handleTestApi(api)}
                            className="px-3.5 py-2 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0"
                          >
                            Fetch Data
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* API response data preview panel */}
                {activeApiTest && (
                  <div className="pt-6 border-t border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Response Viewer</h3>
                      </div>
                      <button 
                        onClick={() => {
                          setActiveApiTest(null);
                          setApiTestResponse(null);
                          setApiTestError('');
                        }}
                        className="p-1 hover:bg-white/15 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <FiX size={16} />
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs text-left overflow-hidden relative">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            {activeApiTest.method}
                          </span>
                          <code className="text-slate-300 font-bold text-xs">{activeApiTest.path}</code>
                        </div>
                        {testingApi && (
                          <div className="flex items-center gap-1.5">
                            <FiLoader className="animate-spin text-blue-400 text-xs" />
                            <span className="text-blue-400 text-[10px] font-bold">Requesting...</span>
                          </div>
                        )}
                      </div>

                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {testingApi ? (
                          <div className="py-12 flex flex-col justify-center items-center gap-2 text-slate-500">
                            <FiLoader className="animate-spin text-lg text-blue-400" />
                            <span className="font-bold">Fetching live payload...</span>
                          </div>
                        ) : apiTestError ? (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-sans text-xs">
                            {apiTestError}
                          </div>
                        ) : apiTestResponse ? (
                          <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                            {JSON.stringify(apiTestResponse, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-slate-600 italic">No response payload recorded.</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Permission Change Logs */}
          <div className="bg-transparent backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden relative p-6 space-y-4 text-left">
            <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none"></div>

            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <FiList className="text-blue-400 text-lg" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Role Modification Audit</h3>
                <p className="text-[10px] text-slate-500 font-medium">History log of permissions changes.</p>
              </div>
            </div>

            {loadingPermissions ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {roleMappings.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 italic text-xs">
                    No permission modifications logged yet.
                  </div>
                ) : (
                  roleMappings.map((log, idx) => (
                    <div 
                      key={log._id || idx} 
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-extrabold px-2 py-0.5 rounded border border-white/5 uppercase">
                          {log.role}
                        </span>
                        {log.updatedAt && (
                          <span className="text-[9px] text-slate-500 font-bold">
                            {new Date(log.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {log.permissions && log.permissions.map(p => (
                          <span key={p} className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                            {p}
                          </span>
                        ))}
                        {(!log.permissions || log.permissions.length === 0) && (
                          <span className="text-[9px] text-red-400 font-semibold italic">
                            Blocked Accounts Access (No permissions)
                          </span>
                        )}
                      </div>

                      {log.modifiedBy && (
                        <div className="text-[9px] text-slate-500 font-bold border-t border-white/5 pt-1.5 flex items-center gap-1">
                          <span>Modified by:</span>
                          <span className="text-slate-400">{log.modifiedBy.name || log.modifiedBy.email || 'System'}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPermissions;
