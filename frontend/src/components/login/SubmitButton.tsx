import React from 'react';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading: boolean;
    loadingText?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ 
    loading, 
    loadingText = "กำลังโหลด...", 
    children, 
    ...props 
}) => {
    return (
        <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-(--greenText) transition-all hover:scale-[1.02] active:scale-[0.98]
                ${loading ? 'bg-(--greyBG) cursor-not-allowed' : 'bg-(--greenBG) border-2 border-(--greenBorder)'}`}
            {...props}
        >
            {loading ? (
                <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border border-white border-t-transparent rounded-full animate-spin"></div>
                    {loadingText}
                </div>
            ) : (
                children
            )}
        </button>
    );
};