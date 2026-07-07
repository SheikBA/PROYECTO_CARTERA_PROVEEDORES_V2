import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-full m-4'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in bg-slate-900/40 backdrop-blur-sm">
            <div 
                className={`hs-modal-panel bg-surface w-full ${sizeClasses[size]} rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in-up border border-slate-200 overflow-hidden`}
                onClick={e => e.stopPropagation()} // Prevent close when clicking inside
            >
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 bg-white">
                    <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="px-6 py-6 overflow-y-auto bg-slate-50/30 flex-1">
                    {children}
                </div>

                {/* Footer (Optional) */}
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
