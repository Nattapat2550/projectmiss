import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    icon: React.ReactNode;
    rightElement?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({ 
    label, 
    icon, 
    rightElement, 
    ...props 
}) => {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                {icon} {label}
            </label>
            <div className="relative">
                <input
                    className="w-full px-4 py-3 rounded-xl bg-(--button) border border-(--shadow) text-foreground focus:ring-2 focus:ring-(--header-bg) outline-none transition-all"
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {rightElement}
                    </div>
                )}
            </div>
        </div>
    );
};