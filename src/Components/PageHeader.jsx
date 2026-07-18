import React from 'react';

const PageHeader = ({ title, icon: Icon, description, action }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 z-10 relative">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          {Icon && <Icon className="text-blue-400 shrink-0" />}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="text-xs md:text-sm text-slate-400 mt-1.5 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default PageHeader;
