'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/theme-context';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    const { getThemeColor } = useTheme();
    const themeColor = getThemeColor();

    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm appearance-none pr-8 ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          style={{
            '--tw-ring-color': themeColor,
          } as React.CSSProperties & { '--tw-ring-color'?: string }}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-gray-400" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };

