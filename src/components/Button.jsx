import React from 'react';

const Button = ({ children, variant = 'primary', onClick, className = '', icon: Icon, loading = false, disabled = false, title = '', type = 'button' }) => {
    const baseStyle = "px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-primary hover:bg-blue-700 text-white shadow-md shadow-blue-500/20",
        secondary: "bg-surface border border-slate-200 text-slate-600 hover:bg-slate-50",
        danger: "bg-red-50 text-danger hover:bg-red-100",
        success: "bg-accent hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20",
        ghost: "text-slate-500 hover:bg-slate-100",
        dark: "bg-slate-800 text-white hover:bg-slate-900 shadow-lg"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            className={`${baseStyle} ${variants[variant]} ${className}`}
            disabled={loading || disabled}
            title={title}
        >
            {loading && <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />}
            {!loading && Icon && <Icon size={18} />}
            {children}
        </button>
    );
};

export default Button;
