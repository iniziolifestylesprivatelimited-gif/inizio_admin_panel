import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute';
import Layout from './Components/Layout';

// Placeholder Pages (Create these in src/pages/)
import Login from './Pages/Auth/Login';
import Dashboard from './Pages/Dashboard';
import ProductList from './Pages/SubMenus/Products/ProductList';
import ProductMapping from './Pages/SubMenus/Products/ProductMapping';
import Category from './Pages/SubMenus/Catalog/Category';
import Brands from './Pages/SubMenus/Catalog/Brands';
import Banners from './Pages/Banners';
import Notifications from './Pages/Notifications';
import Maintenance from './Pages/SubMenus/Settings/Maintenance';
import Profile from './Pages/Common/Profile';
import Variants from './Pages/SubMenus/Products/Variants';
import Cart from './Pages/Cart';
import Chat from './Pages/Chat';
import UsersList from './Pages/SubMenus/Users/UsersList';
import UsersVerification from './Pages/SubMenus/Users/UsersVerification';
import Faqs from './Pages/SubMenus/Settings/Faqs';
import PrivacyP from './Pages/SubMenus/Settings/PrivacyP';
import TermsAndCo from './Pages/SubMenus/Settings/TC';
import Orders from './Pages/Orders';
import { Ledgers } from './Pages/Ledgers';
import UpdatedStock from './Pages/SubMenus/Products/UpdatedStock';

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
              <Route path="/profile" element={<Profile />} />
              <Route path="/products/list" element={<ProductList />} />
              <Route path="/products/mapping" element={<ProductMapping />} />
              <Route path="/products/updated-stock" element={<UpdatedStock />} />
              <Route path="/products/categories" element={<Category />} />
              <Route path="/products/brands" element={<Brands />} />
              <Route path='/banners' element={<Banners/>}/>
              <Route path='/notifications' element={<Notifications/>}/>
              <Route path="/products/variants/:id" element={<Variants />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/ledgers" element={<Ledgers />} />
              <Route path="/chat" element={<Chat/>} />
              <Route path='/users/list' element={<UsersList/>}/>
              <Route path='/users/verify' element={<UsersVerification/>}/>
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