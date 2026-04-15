import React from 'react';
import { cn } from '../lib/utils';

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled,
  size = 'md'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100 dark:shadow-none",
    secondary: "bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--bg-main)] border border-[var(--border-color)]",
    danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30",
    ghost: "bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-main)]",
    accent: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};
