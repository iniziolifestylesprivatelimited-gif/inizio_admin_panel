import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { FiMail, FiLock, FiArrowRight, FiHexagon, FiAlertCircle, FiLoader } from 'react-icons/fi';
import darkThemeImg from '../../assets/dark_theme_img.png';
import logoImg from '../../assets/logos.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();

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
    <div className="min-h-screen flex font-sans bg-linear-to-b from-black to-[#0000B2] text-white">
      
      {/* Left Image Section */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
        
        {/* Decorative blurred blobs for depth */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <img 
          src={darkThemeImg} 
          alt="Dashboard Preview" 
          className="absolute inset-0 w-full h-full object-cover bg-white/0"
        />
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative overflow-hidden">
        
        {/* Decorative blurred blobs for depth */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        {/* Glassmorphism Login Card */}
        <div className="relative w-full max-w-md mx-4 p-8 sm:p-10 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl z-10">
          
          {/* Branding */}
          <div className="flex flex-col items-center justify-center mb-8">
            <img src={logoImg} alt="Inizio Logo" className="w-60" />
            <p className="text-slate-300 text-sm mt-1 font-medium">Welcome back, please LogIn to your account.</p>
          </div>
          
          {/* Error State */}
          {error && (
            <div className="flex items-center bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm font-medium animate-pulse">
              <FiAlertCircle className="text-lg mr-2 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <FiMail className="text-black group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 focus:bg-white/10 text-white placeholder-white/40 transition-all duration-300 shadow-sm"
                  placeholder="admin@inizio.com"
                  required
                />
              </div>
            </div>
            
            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-white ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <FiLock className="text-black group-focus-within:text-white transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 focus:bg-white/10 text-white placeholder-white/40 transition-all duration-300 shadow-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-blue-600/30 group disabled:opacity-70 disabled:cursor-not-allowed"
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