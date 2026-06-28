import React from 'react';
import Image from 'next/image';

interface ButtonProps {
  color?: string;
  border?: string;      // Expected to be a color code or CSS variable
  textColor?: string;   // Added missing type definition
  children: React.ReactNode;
  onClick?: () => void;
}

export const MdxComponents = {
  // 1. Custom Button Component with dynamic colors, text color, borders, and click actions
  HelpButton: ({ 
    color = 'var(--primary-color, #3b82f6)', 
    border, 
    textColor = 'var(--foreground)', // Default to white text
    onClick,
    children 
  }: ButtonProps) => {
    
    // Base inline styles for explicit color injection
    const buttonStyle: React.CSSProperties = {
      backgroundColor: color,
      color: textColor,
      ...(border ? { border: `1px solid ${border}` } : {}),
    };

    return (
      <button 
        style={buttonStyle}
        onClick={onClick}
        className="px-2 py-1 font-medium rounded-md hover:opacity-90 transition duration-150 inline-flex items-center justify-center my-2 mr-2"
      >
        {children}
      </button>
    );
  },

  // 2. Optimized Next.js Image component loading dynamically from /public
  HelpImage: ({ src, alt, width = 800, height = 450 }: { src: string; alt: string; width?: number; height?: number }) => (
    <div 
      style={{
        // Uses your standard CSS wrapper variable and safely defaults to a soft gray if not loaded
        borderColor: 'color-mix(in srgb, var(--wrapper, #e2e8f0) 100%, transparent)'
      }}
      className="my-6 overflow-hidden rounded-lg border bg- (--button)] p-2"
    >
      <Image 
        src={src} 
        alt={alt} 
        width={width} 
        height={height} 
        className="w-full h-auto object-contain rounded"
      />
      {alt && <p className="text-sm text-center opacity-50 mt-2 italic">{alt}</p>}
    </div>
  ),

  // 3. Custom Callout Card for warnings/tips
  Callout: ({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' }) => {
    const bgColors = type === 'warning' ? 'bg-amber-50 border-amber-500/30 text-amber-900' : 'bg-blue-50 border-blue-500/30 text-blue-900';
    return (
      <div className={`p-4 my-4 border-l-4 rounded-r-md ${bgColors} text-base`}>
        {children}
      </div>
    );
  }
};