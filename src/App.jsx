import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute';
import Layout from './Components/Layout';

// Placeholder Pages (Create these in src/pages/)
import Login from './Pages/Auth/Login';
import Dashboard from './Pages/Dashboard';
import ProductList from './Pages/SubMenus/Products/ProductList';
import ProductMapping from './Pages/SubMenus/Products/ProductMapping';
import QuantitySlabs from './Pages/SubMenus/Products/QuantitySlabs';
import Category from './Pages/SubMenus/Catalog/Category';
import Brands from './Pages/SubMenus/Catalog/Brands';
import HomeOrdering from './Pages/SubMenus/Catalog/HomeOrdering';
import Banners from './Pages/Banners';
import Notifications from './Pages/Notifications';
import CampaignStats from './Pages/CampaignStats';
import CampaignDetail from './Pages/CampaignDetail';
import Maintenance from './Pages/SubMenus/Settings/Maintenance';
import Profile from './Pages/Common/Profile';
import Variants from './Pages/SubMenus/Products/editProduct';
import Cart from './Pages/Cart';
import Chat from './Pages/Chat';
import UsersList from './Pages/SubMenus/Users/UsersList';
import UserDetails from './Pages/SubMenus/Users/UserDetails';
import UsersVerification from './Pages/SubMenus/Users/UsersVerification';
import ActiveUsers from './Pages/SubMenus/Users/ActiveUsers';
import DeletionRequests from './Pages/SubMenus/Users/DeletionRequests';
import RolesPermissions from './Pages/SubMenus/Users/RolesPermissions';
import Faqs from './Pages/SubMenus/Settings/Faqs';
import PrivacyP from './Pages/SubMenus/Settings/PrivacyP';
import TermsAndCo from './Pages/SubMenus/Settings/TC';
import Orders from './Pages/Orders';
import { Ledgers } from './Pages/Ledgers';
import Coupons from './Pages/Coupons';
import ActivityDetails from './Pages/ActivityDetails';
import Quotes from './Pages/Quotes';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
              <Route path='/users/verify' element={<UsersVerification/>}/>
              <Route path='/users/active' element={<ActiveUsers/>}/>
              <Route path='/users/deletion-requests' element={<DeletionRequests/>}/>
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;