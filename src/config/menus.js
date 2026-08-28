import { 
  FiHome, FiUsers, FiBox, FiTruck, FiDollarSign, FiSettings, 
  FiActivity, FiPieChart, FiBriefcase, FiShoppingCart, 
  FiMapPin, FiRefreshCcw, FiFileText, FiServer, FiShield, 
  FiBookOpen, FiPercent, FiSend, FiEye, FiArchive,
  FiCreditCard, FiNavigation, FiPaperclip, FiAlertTriangle,
  FiImage, FiBell, FiPackage, FiTag, FiGrid, FiTool, FiMessageCircle,
  FiUserCheck, FiUser, FiHelpCircle, FiFile, FiFilter,
  FiLoader, FiX, FiCheckCircle, FiSliders, FiUserMinus,
  FiUserPlus
} from 'react-icons/fi';
import { filterAccessibleMenus } from '../utils/rbac';

const PAGES = {
  DASHBOARD: { path: '/', name: 'Dashboard', icon: FiHome },

  BANNERS: { path: '/banners', name: 'Banners', icon: FiImage, permission: 'banners_manage' },
  NOTIFICATIONS: { path: '/notifications', name: 'Notifications', icon: FiBell, permission: 'notifications_send' },
  CAMPAIGN_STATS: { path: '/campaign-stats', name: 'Campaign Stats', icon: FiActivity, permission: 'campaigns_view' },
  CHAT: { path: '/chat', name: 'Chat', icon: FiMessageCircle, permission: 'chat_view' },
  ORDERS: {
    name: 'Orders',
    icon: FiShoppingCart,
    subMenus: [
      { path: '/orders/all', name: 'All Orders', icon: FiShoppingCart, permission: 'orders_view' },
      { path: '/orders/delivered', name: 'Delivered & Returns', icon: FiCheckCircle, permission: 'orders_manage' }
    ]
  },
  LEDGERS: { path: '/ledgers', name: 'Ledgers', icon: FiFile, permission: 'ledgers_manage' },

  CATALOG_MASTERS: {
    name: 'Catalog',
    icon: FiArchive,
    subMenus: [
      { path: '/products/brands', name: 'Brands', icon: FiTag, permission: 'products_view' },
      { path: '/products/categories', name: 'Categories', icon: FiGrid, permission: 'products_view' },
      { path: '/products/home-order', name: 'Home Ordering', icon: FiSliders, permission: 'products_manage' }
    ]
  },

  PRODUCTS_CATALOG: { 
    name: 'Products', 
    icon: FiBox,
    subMenus: [
      { path: '/products/list', name: 'Product List', icon: FiPackage, permission: 'products_view' },
      { path: '/products/mapping', name: 'Product Mapping', icon: FiFilter, permission: 'products_manage' },
      { path: '/products/slabs', name: 'Quantity Slabs', icon: FiSliders, permission: 'products_manage' },
      { path: '/products/broken-images', name: 'Broken Images', icon: FiAlertTriangle, permission: 'products_manage' }
    ]
  },

  SETTINGS: {
    name: 'Settings',
    icon: FiSettings,
    subMenus: [
      { path: '/settings/notifications', name: 'Notification Alerts', icon: FiBell },
      { path: '/settings/maintenance', name: 'Maintenance', icon: FiTool, role: 'admin' },
      { path: '/settings/faqs', name: 'FAQs', icon: FiHelpCircle },
      { path: '/settings/privacy-policy', name: 'Privacy Policy', icon: FiShield },
      { path: '/settings/terms-and-conditions', name: 'Terms and Conditions', icon: FiFileText },
    ]
  },

  USER_MGMT: { 
    name: 'Users', 
    icon: FiUser,
    subMenus: [
      { path: '/users/list', name: 'Users List', icon: FiUsers, permission: 'customers_view' },
      { path: '/users/active', name: 'Login Activity', icon: FiActivity, permission: 'customers_manage' },
      { path: '/users/roles-permissions', name: 'Roles & Permissions', icon: FiShield, role: 'admin' }
    ]
  },

  COUPONS: { path: '/coupons', name: 'Coupons', icon: FiPercent, permission: 'products_manage' },
  QUOTES: { path: '/quotes', name: 'Quotes Requests', icon: FiFileText, permission: 'orders_view' },
};

export const getAccessibleMenus = (userPermissions = [], userRole = '') => {
  const allMenus = [
    PAGES.DASHBOARD, 
    PAGES.USER_MGMT, 
    PAGES.CATALOG_MASTERS,
    PAGES.PRODUCTS_CATALOG, 
    PAGES.ORDERS,
    PAGES.LEDGERS,
    PAGES.COUPONS,
    PAGES.QUOTES,
    PAGES.BANNERS, 
    PAGES.CHAT,
    PAGES.NOTIFICATIONS, 
    PAGES.CAMPAIGN_STATS,
    PAGES.SETTINGS
  ];

  return filterAccessibleMenus(allMenus, userPermissions, userRole);
};