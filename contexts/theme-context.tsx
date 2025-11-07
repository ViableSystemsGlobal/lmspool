"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useBranding } from './branding-context';

export type ThemeColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'indigo' | 'pink' | 'teal';

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  getThemeClasses: () => {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    primaryBg: string;
    primaryHover: string;
    primaryText: string;
    primaryBorder: string;
  };
  getThemeColor: () => string;
  customLogo: string | null;
  setCustomLogo: (logo: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfig = {
  purple: {
    primary: 'purple-600',
    primaryLight: 'purple-500',
    primaryDark: 'purple-700',
    primaryBg: 'purple-50',
    primaryHover: 'purple-100',
    primaryText: 'purple-700',
    primaryBorder: 'purple-600',
  },
  blue: {
    primary: 'blue-600',
    primaryLight: 'blue-500',
    primaryDark: 'blue-700',
    primaryBg: 'blue-50',
    primaryHover: 'blue-100',
    primaryText: 'blue-700',
    primaryBorder: 'blue-600',
  },
  green: {
    primary: 'green-600',
    primaryLight: 'green-500',
    primaryDark: 'green-700',
    primaryBg: 'green-50',
    primaryHover: 'green-100',
    primaryText: 'green-700',
    primaryBorder: 'green-600',
  },
  orange: {
    primary: 'orange-600',
    primaryLight: 'orange-500',
    primaryDark: 'orange-700',
    primaryBg: 'orange-50',
    primaryHover: 'orange-100',
    primaryText: 'orange-700',
    primaryBorder: 'orange-600',
  },
  red: {
    primary: 'red-600',
    primaryLight: 'red-500',
    primaryDark: 'red-700',
    primaryBg: 'red-50',
    primaryHover: 'red-100',
    primaryText: 'red-700',
    primaryBorder: 'red-600',
  },
  indigo: {
    primary: 'indigo-600',
    primaryLight: 'indigo-500',
    primaryDark: 'indigo-700',
    primaryBg: 'indigo-50',
    primaryHover: 'indigo-100',
    primaryText: 'indigo-700',
    primaryBorder: 'indigo-600',
  },
  pink: {
    primary: 'pink-600',
    primaryLight: 'pink-500',
    primaryDark: 'pink-700',
    primaryBg: 'pink-50',
    primaryHover: 'pink-100',
    primaryText: 'pink-700',
    primaryBorder: 'pink-600',
  },
  teal: {
    primary: 'teal-600',
    primaryLight: 'teal-500',
    primaryDark: 'teal-700',
    primaryBg: 'teal-50',
    primaryHover: 'teal-100',
    primaryText: 'teal-700',
    primaryBorder: 'teal-600',
  },
};

// Hex color values for charts and other uses
const themeColorValues = {
  purple: '#9333ea',
  blue: '#2563eb',
  green: '#16a34a',
  orange: '#ea580c',
  red: '#dc2626',
  indigo: '#4f46e5',
  pink: '#db2777',
  teal: '#0d9488',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState<ThemeColor>('orange');
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const branding = useBranding();

  // Load theme and logo from branding context (system-wide settings)
  useEffect(() => {
    // Always use branding settings for system-wide consistency
    if (branding.branding.companyLogo) {
      setCustomLogo(branding.branding.companyLogo);
    }
    
    // Set theme color based on branding primary color
    if (branding.branding.primaryColor) {
      const hexColor = branding.branding.primaryColor.toLowerCase();
      if (hexColor === '#dc2626' || hexColor === '#b91c1c') {
        setThemeColor('red');
      } else if (hexColor === '#9333ea' || hexColor === '#7c3aed') {
        setThemeColor('purple');
      } else if (hexColor === '#2563eb' || hexColor === '#1d4ed8') {
        setThemeColor('blue');
      } else if (hexColor === '#16a34a' || hexColor === '#15803d') {
        setThemeColor('green');
      } else if (hexColor === '#ea580c' || hexColor === '#c2410c') {
        setThemeColor('orange');
      } else if (hexColor === '#4f46e5' || hexColor === '#4338ca') {
        setThemeColor('indigo');
      } else if (hexColor === '#db2777' || hexColor === '#be185d') {
        setThemeColor('pink');
      } else if (hexColor === '#0d9488' || hexColor === '#0f766e') {
        setThemeColor('teal');
      } else {
        setThemeColor('orange'); // Default to orange (user's preference)
      }
    }
  }, [branding.branding.companyLogo, branding.branding.primaryColor]);

  // Save theme to localStorage when it changes
  const handleSetThemeColor = (color: ThemeColor) => {
    setThemeColor(color);
    localStorage.setItem('themeColor', color);
  };

  // Save logo to localStorage when it changes
  const handleSetCustomLogo = (logo: string | null) => {
    setCustomLogo(logo);
    if (logo) {
      localStorage.setItem('customLogo', logo);
    } else {
      localStorage.removeItem('customLogo');
    }
  };

  const getThemeClasses = () => {
    // Use branding context for consistent theming across all users
    return branding.getThemeClasses();
  };

  const getThemeColor = () => {
    // Always use branding color for system-wide consistency
    return branding.branding.primaryColor || '#ea580c'; // Default to orange
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        themeColor, 
        setThemeColor: handleSetThemeColor, 
        getThemeClasses,
        getThemeColor,
        customLogo,
        setCustomLogo: handleSetCustomLogo
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

