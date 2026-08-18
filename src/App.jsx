import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute';
import Layout from './Components/Layout';
import { ConfirmationProvider } from './Context/ConfirmationContext';

// Lazy Loaded Pages
const Login = lazy(() => import('./Pages/Auth/Login'));
const Dashboard = lazy(() => import('./Pages/Dashboard'));
const ProductList = lazy(() => import('./Pages/SubMenus/Products/ProductList'));
const ProductMapping = lazy(() => import('./Pages/SubMenus/Products/ProductMapping'));
const QuantitySlabs = lazy(() => import('./Pages/SubMenus/Products/QuantitySlabs'));
const Category = lazy(() => import('./Pages/SubMenus/Catalog/Category'));
const Brands = lazy(() => import('./Pages/SubMenus/Catalog/Brands'));
const HomeOrdering = lazy(() => import('./Pages/SubMenus/Catalog/HomeOrdering'));
const Banners = lazy(() => import('./Pages/Banners'));
const Notifications = lazy(() => import('./Pages/Notifications'));
const CampaignStats = lazy(() => import('./Pages/CampaignStats'));
const CampaignDetail = lazy(() => import('./Pages/CampaignDetail'));
const Maintenance = lazy(() => import('./Pages/SubMenus/Settings/Maintenance'));
const Profile = lazy(() => import('./Pages/Common/Profile'));
const Variants = lazy(() => import('./Pages/SubMenus/Products/editProduct'));
const BrokenImages = lazy(() => import('./Pages/SubMenus/Products/BrokenImages'));
const Cart = lazy(() => import('./Pages/Cart'));
const Chat = lazy(() => import('./Pages/Chat'));
const UsersList = lazy(() => import('./Pages/SubMenus/Users/UsersList'));
const UserDetails = lazy(() => import('./Pages/SubMenus/Users/UserDetails'));
const ActiveUsers = lazy(() => import('./Pages/SubMenus/Users/ActiveUsers'));
const RolesPermissions = lazy(() => import('./Pages/SubMenus/Users/RolesPermissions'));
const Faqs = lazy(() => import('./Pages/SubMenus/Settings/Faqs'));
const PrivacyP = lazy(() => import('./Pages/SubMenus/Settings/PrivacyP'));
const TermsAndCo = lazy(() => import('./Pages/SubMenus/Settings/TC'));
const Orders = lazy(() => import('./Pages/Orders'));
const Ledgers = lazy(() => import('./Pages/Ledgers').then(m => ({ default: m.Ledgers })));
const Coupons = lazy(() => import('./Pages/Coupons'));
const ActivityDetails = lazy(() => import('./Pages/ActivityDetails'));
const Quotes = lazy(() => import('./Pages/Quotes'));

function App() {
  return (
    <AuthProvider>
      <ConfirmationProvider>
        <BrowserRouter>
          <Suspense fallback={
            <div className="h-screen w-screen flex flex-col justify-center items-center bg-slate-950">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              <p className="text-slate-400 mt-4 font-semibold text-xs tracking-wider uppercase">Loading page elements...</p>
            </div>
          }>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* BASE PROTECTION: Check if user is logged in */}
              <Route element={<ProtectedRoute />}>
                
                {/* LAYOUT: Now guaranteed to have a 'user' object */}
                <Route element={<Layout />}>
                  
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard/details/:type" element={<ActivityDetails />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/products/list" element={<ProductList />} />
                  <Route path="/products/mapping" element={<ProductMapping />} />
                  <Route path="/products/slabs" element={<QuantitySlabs />} />
                  <Route path="/products/broken-images" element={<BrokenImages />} />
                  <Route path="/products/categories" element={<Category />} />
                  <Route path="/products/brands" element={<Brands />} />
                  <Route path="/products/home-order" element={<HomeOrdering />} />
                  <Route path='/banners' element={<Banners/>}/>
                  <Route path='/notifications' element={<Notifications/>}/>
                  <Route path='/campaign-stats' element={<CampaignStats/>}/>
                  <Route path='/campaign-stats/:campaignId' element={<CampaignDetail/>}/>
                  <Route path="/products/variants/:id" element={<Variants />} />
                  <Route path="/orders" element={<Navigate to="/orders/all" replace />} />
                  <Route path="/orders/all" element={<Orders defaultStatus="all" />} />
                  <Route path="/orders/processing" element={<Orders defaultStatus="processing" />} />
                  <Route path="/orders/shipped" element={<Orders defaultStatus="shipped" />} />
                  <Route path="/orders/cancelled" element={<Orders defaultStatus="cancelled" />} />
                  <Route path="/orders/delivered" element={<Orders defaultStatus="delivered" />} />
                  <Route path="/ledgers" element={<Ledgers />} />
                  <Route path="/coupons" element={<Coupons />} />
                  <Route path="/quotes" element={<Quotes />} />
                  <Route path="/chat" element={<Chat/>} />
                  <Route path='/users/list' element={<UsersList/>}/>
                  <Route path='/users/list/:id' element={<UserDetails/>}/>
                  <Route path='/users/active' element={<ActiveUsers/>}/>
                  <Route path='/users/roles-permissions' element={<RolesPermissions/>}/>
                  <Route path='/users/create' element={<RolesPermissions/>}/>
                  <Route path="/settings/maintenance" element={<Maintenance />} />
                  <Route path="/settings/faqs" element={<Faqs/>} />
                  <Route path="/settings/privacy-policy" element={<PrivacyP/>} />
                  <Route path="/settings/terms-and-conditions" element={<TermsAndCo/>} />

                </Route>
              </Route>
              
              {/* Catch-all route: Redirect unknown URLs to Dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ConfirmationProvider>
    </AuthProvider>
  );
}

export default App;