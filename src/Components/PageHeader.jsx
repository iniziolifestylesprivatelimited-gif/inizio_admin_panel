import React from 'react';

const PageHeader = ({ title, icon: Icon, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10 ${className}`}>
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          {Icon && <Icon className="text-blue-600 dark:text-blue-400 shrink-0" />}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default PageHeader;
