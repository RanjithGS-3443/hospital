import { Hospital } from 'lucide-react';
import type React from 'react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ className, iconSize = 8, textSize = "text-2xl" }) => (
  <div className={`flex items-center gap-2 text-primary ${className}`}>
    <Hospital className={`h-${iconSize} w-${iconSize}`} />
    <span className={`${textSize} font-bold`}>HealthDesk</span>
  </div>
);
