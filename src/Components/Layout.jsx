import { useState, useEffect } from 'react';
import { Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { 
  FiLogOut, FiMenu, FiX, FiUser,
  FiBell, FiChevronDown, FiChevronRight
} from 'react-icons/fi';
import { getAccessibleMenus } from '../config/menus';
import HeaderSearch from './HeaderSearch';
import logoImg from '../assets/logos.png';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const toggleSubMenu = (menuName) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  // Close mobile menu automatically when a route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userMenus = getAccessibleMenus();

  return (
    <div className="flex h-screen bg-linear-to-br from-black via-slate-950 to-blue-950 font-sans overflow-hidden text-slate-300 relative z-0">
      
      {/* Global Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 transform-gpu">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 transform-gpu"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-120 h-120 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[120px] opacity-50 transform-gpu"></div>
      </div>

      {/* MOBILE TOP BAR (Visible only on small screens) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/5 backdrop-blur-2xl border-b border-white/10 z-30 flex items-center justify-between px-4 shadow-xl shadow-black/50">
        <img src={logoImg} alt="logo" className="h-14 w-auto object-contain scale-200 origin-left mt-1.5" />
        <div className="flex items-center gap-4">
          <button className="text-slate-300 hover:text-white relative transition-colors">
            <FiBell className="text-xl" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Mobile Profile Dropdown */}
          <div className="relative">
            <div 
              className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs shadow-inner cursor-pointer"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
            {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-white/10 mb-1">
                  <p className="text-sm font-semibold text-white line-clamp-1">{user.email || 'User'}</p>
                <p className="text-xs text-slate-400 capitalize">Administrator</p>
                </div>
                <Link 
                  to="/profile" 
                  className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <FiUser className="mr-2" /> Profile
                </Link>
                <button 
                  onClick={logout}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <FiLogOut className="mr-2" /> Logout
                </button>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1 text-slate-300 hover:text-white focus:outline-none transition-colors"
          >
            <FiMenu className="text-2xl" />
          </button>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white/5 backdrop-blur-2xl border-r border-white/10 flex flex-col shadow-2xl shadow-black/50 lg:shadow-none
        transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 overflow-hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 transform-gpu">
          <div className="absolute top-[10%] -left-[20%] w-64 h-64 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[80px] opacity-60 transform-gpu"></div>
          <div className="absolute bottom-[20%] -right-[20%] w-72 h-72 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 transform-gpu"></div>
        </div>

        <div className="h-16 flex items-center justify-center px-6 border-b border-white/10 bg-transparent shrink-0">
          <img src={logoImg} alt="logo" className="h-14 w-auto object-contain scale-200 mt-1.5" />
          <button 
            className="lg:hidden text-slate-400 hover:text-red-400"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FiX className="text-2xl" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-2 mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
            MAIN MENU
          </p>
          
          {userMenus.map((menu) => {
            
            if (!menu) return null;
            const Icon = menu.icon;
            
            // IF THIS MENU HAS SUB-MENUS (Dropdown Logic)
            if (menu.subMenus) {
              const isOpen = openMenus[menu.name];
              // Check if any sub-menu is the currently active page so we can highlight the parent
              const isChildActive = menu.subMenus.some(sub => location.pathname === sub.path);

              return (
                <div key={menu.name} className="space-y-1">
                  {/* Parent Toggle Button */}
                  <button 
                    onClick={() => toggleSubMenu(menu.name)}
                    className={`
                      w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                      ${isChildActive && !isOpen ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center">
                      {Icon && <Icon className="text-lg mr-3 group-hover:scale-110 transition-transform" />}
                      <span className="font-medium text-sm">{menu.name}</span>
                    </div>
                    <FiChevronRight className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-blue-400' : 'text-slate-500'}`} />
                  </button>

                  {/* Collapsible Sub-Menus */}
                  {isOpen && (
                    <div className="pl-11 pr-2 py-1 space-y-1">
                      {menu.subMenus.map((sub) => {
                        const isSubActive = location.pathname === sub.path;
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className={`
                              flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                              ${isSubActive 
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'text-slate-400 hover:bg-white/10 hover:text-white'
                              }
                            `}
                          >
                            {SubIcon && <SubIcon className="text-base mr-3" />}
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // IF THIS IS A STANDARD FLAT LINK
            const isActive = location.pathname === menu.path;
            return (
              <Link 
                key={menu.path} 
                to={menu.path} 
                className={`
                  flex items-center px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-500/30' 
                    : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
                  }
                `}
              >
                {Icon && <Icon className={`text-lg mr-3 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />}
                <span className="font-medium text-sm">{menu.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT WRAPPER (Includes Header, Content, Footer) */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-transparent relative pt-16 lg:pt-0">
        
        {/* GLOBAL HEADER (Desktop Top Bar) */}
        <header className="hidden lg:flex h-16 bg-white/5 backdrop-blur-2xl border-b border-white/10 shadow-sm shadow-black/50 items-center justify-between px-8 sticky top-0 z-20">
          
          {/* Left Side: Global Search */}
          <HeaderSearch />

          {/* Right Side: Profile & Notifications */}
          <div className="flex items-center space-x-6">
            <button className="text-slate-400 hover:text-blue-600 relative transition-colors">
              <FiBell className="text-xl" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
            </button>
            
            <div className="h-8 w-px bg-white/10"></div>

            {/* Profile Dropdown Trigger */}
            <div className="relative">
              <div 
                className="flex items-center cursor-pointer group"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="ml-3 hidden md:block">
                  <p className="text-xs font-bold text-white">Admin Account</p>
                <p className="text-[10px] text-slate-400 uppercase">Administrator</p>
                </div>
                <FiChevronDown className="ml-2 text-slate-400 group-hover:text-white transition-colors" />
              </div>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-white/10 mb-1">
                    <p className="text-sm font-semibold text-white line-clamp-1">{user.email || 'User'}</p>
                  <p className="text-xs text-slate-400 capitalize">Administrator</p>
                  </div>
                  <Link 
                    to="/profile" 
                    className="flex items-center px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <FiUser className="mr-2" /> Profile
                  </Link>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <FiLogOut className="mr-2" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-h-full">
            <Outlet />
          </div>
        </main>

        {/* GLOBAL FOOTER */}
        <footer className="bg-white/5 backdrop-blur-2xl border-t border-white/10 shadow-lg shadow-black/50 py-4 px-8 mt-auto z-10 relative">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 font-medium">
            <p>© {new Date().getFullYear()} Inizio Workspace. All rights reserved.</p>
            <div className="flex items-center space-x-4 mt-2 md:mt-0">
              <Link to="/help" className="hover:text-blue-400 transition-colors">Help Center</Link>
              <Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link>
              <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded-md border border-white/10">
                v1.2.0
              </span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default Layout;