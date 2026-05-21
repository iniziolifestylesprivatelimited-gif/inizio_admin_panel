import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="relative min-h-[70vh] flex flex-col items-center justify-center z-0">
      {/* Glassmorphism Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none z-[-1]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-50 pointer-events-none z-[-1]"></div>

      <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
      <h2 className="text-2xl font-semibold text-white mb-2">Access Denied</h2>
      <p className="text-slate-400 mb-6 text-center max-w-md">
        You do not have the required permissions to view this page. If you believe this is an error, please contact your Super Admin.
      </p>
      <Link 
        to="/" 
        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 font-bold"
      >
        Return to Dashboard
      </Link>
    </div>
  );
};

export default Unauthorized;