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

const PAGES = {
  DASHBOARD: { path: '/', name: 'Dashboard', icon: FiHome },

  BANNERS: { path: '/banners', name: 'Banners', icon: FiImage },
  NOTIFICATIONS: { path: '/notifications', name: 'Notifications', icon: FiBell },
  CAMPAIGN_STATS: { path: '/campaign-stats', name: 'Campaign Stats', icon: FiActivity },
  CHAT: { path: '/chat', name: 'Chat', icon: FiMessageCircle },
  ORDERS: {
    name: 'Orders',
    icon: FiShoppingCart,
    subMenus: [
      { path: '/orders/all', name: 'All Orders', icon: FiShoppingCart },
      { path: '/orders/processing', name: 'Processing', icon: FiLoader },
      { path: '/orders/shipped', name: 'Shipped', icon: FiTruck },
      { path: '/orders/cancelled', name: 'Cancelled', icon: FiX },
      { path: '/orders/delivered', name: 'Delivered & Returns', icon: FiCheckCircle }
    ]
  },
  LEDGERS: {path: '/ledgers', name: 'Ledgers', icon: FiFile},


    // --- NESTED MENUS --------------------------------------------------------------
  CATALOG_MASTERS: {
    name: 'Catalog',
    icon: FiArchive,
    subMenus: [
      { path: '/products/brands', name: 'Brands', icon: FiTag },
      { path: '/products/categories', name: 'Categories', icon: FiGrid },
      { path: '/products/home-order', name: 'Home Ordering', icon: FiSliders }
    ]
  },

  PRODUCTS_CATALOG: { 
    name: 'Products', 
    icon: FiBox,
    // When subMenus exists, the Layout will render it as a dropdown
    subMenus: [
      { path: '/products/list', name: 'Product List', icon: FiPackage },
      { path: '/products/mapping', name: 'Product Mapping', icon: FiFilter },
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
      { path: '/users/verify', name: 'Users Verification', icon: FiUserCheck },
      { path: '/users/active', name: 'Active Users', icon: FiActivity },
      { path: '/users/deletion-requests', name: 'Deletion Requests', icon: FiUserMinus },
      { path: '/users/roles-permissions', name: 'Roles & Permissions', icon: FiShield }
    ]
  },

  COUPONS: { path: '/coupons', name: 'Coupons', icon: FiPercent },
};

  
export const getAccessibleMenus = () => {
  return [
    PAGES.DASHBOARD, 
    PAGES.USER_MGMT, 
    PAGES.CATALOG_MASTERS,
    PAGES.PRODUCTS_CATALOG, 
    PAGES.ORDERS,
    PAGES.LEDGERS,
    PAGES.COUPONS,
    PAGES.BANNERS, 
    PAGES.CHAT,
    PAGES.NOTIFICATIONS, 
    PAGES.CAMPAIGN_STATS,
    PAGES.SETTINGS
  ];
};