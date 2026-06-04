import { 
  FiHome, FiUsers, FiBox, FiTruck, FiDollarSign, FiSettings, 
  FiActivity, FiPieChart, FiBriefcase, FiShoppingCart, 
  FiMapPin, FiRefreshCcw, FiFileText, FiServer, FiShield, 
  FiBookOpen, FiPercent, FiSend, FiEye, FiArchive,
  FiCreditCard, FiNavigation, FiPaperclip, FiAlertTriangle,
  FiImage, FiBell, FiPackage, FiTag, FiGrid, FiTool, FiMessageCircle,
  FiUserCheck, FiUser, FiHelpCircle, FiFile, FiFilter
} from 'react-icons/fi';

const PAGES = {
  DASHBOARD: { path: '/', name: 'Dashboard', icon: FiHome },

  BANNERS: { path: '/banners', name: 'Banners', icon: FiImage },
  NOTIFICATIONS: { path: '/notifications', name: 'Notifications', icon: FiBell },
  CHAT: { path: '/chat', name: 'Chat', icon: FiMessageCircle },
  ORDERS: { path: '/orders', name: 'Orders', icon: FiShoppingCart },
  LEDGERS: {path: '/ledgers', name: 'Ledgers', icon: FiFile},


    // --- NESTED MENUS --------------------------------------------------------------
  PRODUCTS_CATALOG: { 
    name: 'Products', 
    icon: FiBox,
    // When subMenus exists, the Layout will render it as a dropdown
    subMenus: [
      { path: '/products/brands', name: 'Brands', icon: FiTag },
      { path: '/products/categories', name: 'Categories', icon: FiGrid },
      { path: '/products/list', name: 'Product List', icon: FiPackage },
      { path: '/products/mapping', name: 'Product Mapping', icon: FiFilter }
    ]
  },

  SETTINGS:{
    name: 'Settings',
    icon: FiSettings,
    subMenus:[
      { path: '/settings/maintenance', name: 'Maintenance', icon: FiTool },
      { path: '/settings/faqs', name: 'FAQs', icon: FiHelpCircle },
      { path: '/settings/privacy-policy', name: 'Privacy Policy', icon: FiShield },
      { path: '/settings/terms-and-conditions', name: 'Terms and Conditions', icon: FiFileText },
    ]
  },

  USER_MGMT: { 
    name: 'Users', 
    icon: FiUser,
    subMenus:[
      { path: '/users/list', name: 'Users List', icon: FiUsers },
      { path: '/users/verify', name: 'Users Verification', icon: FiUserCheck }
    ]
  }
};

  
export const getAccessibleMenus = () => {
  return [
    PAGES.DASHBOARD, 
    PAGES.USER_MGMT, 
    PAGES.PRODUCTS_CATALOG, 
    PAGES.ORDERS,
    PAGES.LEDGERS,
    PAGES.BANNERS, 
    PAGES.CHAT,
    PAGES.NOTIFICATIONS, 
    PAGES.SETTINGS
  ];
};