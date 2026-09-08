import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useTheme } from '../../Context/ThemeContext';
import { FiMail, FiLock, FiArrowRight, FiAlertCircle, FiLoader, FiSun, FiMoon } from 'react-icons/fi';
import darkThemeImg from '../../assets/login_image_2.webp';
import logoImg from '../../assets/logos.png';
import lightLogoImg from '../../assets/inizio_logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans overflow-hidden relative transition-colors duration-300 bg-linear-to-br from-slate-50 via-blue-50/50 to-indigo-100/70 text-slate-700 dark:from-black dark:via-slate-950 dark:to-blue-950 dark:text-slate-300">
      
      {/* Floating Theme Switcher */}
      <div className="absolute top-5 right-5 z-50">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-md text-xs font-semibold cursor-pointer transition-all duration-200 shadow-md bg-white/80 hover:bg-white border-slate-200/80 text-slate-700 shadow-slate-200/50 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:border-white/10 dark:text-slate-200 dark:shadow-black/40"
          title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <>
              <FiSun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <FiMoon className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Left Image Section */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative">
        
        {/* Decorative blurred blobs for depth */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-25 dark:opacity-20 animate-blob transform-gpu bg-gradient-to-r from-blue-400 to-indigo-400 dark:from-blue-600 dark:to-indigo-600"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-25 dark:opacity-20 animate-blob animation-delay-2000 transform-gpu bg-gradient-to-r from-blue-400 to-indigo-400 dark:from-blue-600 dark:to-indigo-600"></div>

        {/* Subtle glow behind the image */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full filter z-0 transform-gpu transition-all duration-500 bg-blue-400/20 mix-blend-multiply blur-[80px] dark:bg-blue-600/60 dark:mix-blend-screen dark:blur-[100px]"></div>

        <img 
          src={darkThemeImg}
          alt="Dashboard Preview" 
          className="absolute scale-95 object-cover bg-white/0 drop-shadow-[0_20px_40px_rgba(30,58,138,0.15)] dark:drop-shadow-[0_0_30px_rgba(37,99,235,0.3)] z-10 transition-all duration-500"
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative transform-gpu">
        
        {/* Decorative blurred blobs for depth */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply filter blur-3xl opacity-25 dark:opacity-20 animate-blob transform-gpu"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-25 dark:opacity-20 animate-blob animation-delay-2000 transform-gpu bg-gradient-to-r from-blue-400 to-indigo-400 dark:from-blue-600 dark:to-indigo-600"></div>

        {/* Glassmorphism Login Card */}
        <div className="relative scale-90 w-full max-w-md mx-4 p-8 sm:p-10 bg-white/10 dark:bg-transparent backdrop-blur-xl dark:backdrop-blur-md transform-gpu border border-white/80 dark:border-white/20 shadow-2xl shadow-blue-950/10 dark:shadow-2xl rounded-3xl z-10 transition-all duration-300">
          
          {/* Branding */}
          <div className="flex flex-col items-center justify-center mb-8">
            <img 
              src={isDark ? logoImg : lightLogoImg} 
              alt="Inizio Logo" 
              className="w-60 transition-opacity duration-300" 
            />
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 font-medium text-center">
              Welcome back, please LogIn to your account.
            </p>
          </div>
          
          {/* Error State */}
          {error && (
            <div className="flex items-center bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 p-4 rounded-xl mb-6 text-sm font-medium animate-pulse">
              <FiAlertCircle className="text-lg mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-white ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <FiMail className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 backdrop-blur-md transform-gpu transition-all duration-300 ${
                    isDark
                      ? "bg-black/20 border border-white/10 focus:ring-blue-600/50 focus:bg-black/40 shadow-inner text-white placeholder-slate-500"
                      : "bg-white/90 border border-slate-200/90 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white shadow-xs text-slate-800 placeholder-slate-400"
                  }`}
                  placeholder="admin@inizio.com"
                  required
                />
              </div>
            </div>
            
            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-white ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <FiLock className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 backdrop-blur-md transform-gpu transition-all duration-300 ${
                    isDark
                      ? "bg-black/20 border border-white/10 focus:ring-blue-600/50 focus:bg-black/40 shadow-inner text-white placeholder-slate-500"
                      : "bg-white/90 border border-slate-200/90 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white shadow-xs text-slate-800 placeholder-slate-400"
                  }`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center text-white py-3.5 rounded-xl transition-all duration-300 font-semibold group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
            >
              {isLoading ? (
                <FiLoader className="animate-spin text-xl" />
              ) : (
                <>
                  LogIn
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;