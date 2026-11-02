import React from 'react';

interface ZuxoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitle?: string;
  className?: string;
}

export const ZuxoLogo: React.FC<ZuxoLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  subtitle = 'PLAYER',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl md:text-3xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-6xl',
  };

  const subtitleClasses = {
    sm: 'text-[9px] tracking-[0.25em]',
    md: 'text-[11px] tracking-[0.3em]',
    lg: 'text-sm tracking-[0.35em]',
    xl: 'text-base tracking-[0.4em]',
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div className={`font-black tracking-tight leading-none ${sizeClasses[size]} flex items-baseline font-display`}>
        <span className="text-white drop-shadow-sm">Zux</span>
        <span 
          className="text-[#00F59B] inline-block relative ml-[0.5px]"
          style={{
            textShadow: '0 0 20px rgba(0, 245, 155, 0.75), 0 0 40px rgba(0, 245, 155, 0.4)'
          }}
        >
          o
        </span>
      </div>
      {showSubtitle && (
        <span 
          className={`font-bold uppercase text-[#00F59B]/90 mt-0.5 ${subtitleClasses[size]}`}
          style={{ textShadow: '0 0 10px rgba(0, 245, 155, 0.4)' }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
};
