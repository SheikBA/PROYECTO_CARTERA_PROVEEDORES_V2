import React from 'react';

const Card = ({ children, className = '', padding = 'p-6', onClick }) => {
    return (
        <div 
            onClick={onClick}
            className={`bg-surface rounded-xl shadow-sm border border-slate-100 ${padding} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
        >
            {children}
        </div>
    );
};

export default Card;
