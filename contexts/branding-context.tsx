"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BrandingSettings {
  companyName: string;
  companyLogo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  description: string;
}

interface BrandingContextType {
  branding: BrandingSettings;
  loading: boolean;
  refreshBranding: () => Promise<void>;
  getThemeColor: () => string;
  getThemeClasses: () => {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    primaryBg: string;
    primaryHover: string;
    primaryText: string;
    primaryBorder: string;
  };
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

// Default branding settings for LMS
const defaultBranding: BrandingSettings = {
  companyName: 'LMS - Learning Management System',
  companyLogo: '',
  favicon: '/favicon.ico',
  primaryColor: '#ea580c', // Orange as default (matching user's preference)
  secondaryColor: '#c2410c', // Dark orange as default
  description: 'Learning Management System for Staff Training'
};

// Convert hex color to Tailwind classes
function hexToTailwindClasses(hexColor: string) {
  // Map common hex colors to Tailwind classes
  const colorMap: { [key: string]: string } = {
    '#dc2626': 'red-600',
    '#b91c1c': 'red-700',
    '#9333ea': 'purple-600',
    '#7c3aed': 'purple-700',
    '#2563eb': 'blue-600',
    '#1d4ed8': 'blue-700',
    '#16a34a': 'green-600',
    '#15803d': 'green-700',
    '#ea580c': 'orange-600',
    '#c2410c': 'orange-700',
    '#4f46e5': 'indigo-600',
    '#4338ca': 'indigo-700',
    '#db2777': 'pink-600',
    '#be185d': 'pink-700',
    '#0d9488': 'teal-600',
    '#0f766e': 'teal-700',
  };

  const primaryClass = colorMap[hexColor] || 'orange-600';
  const primaryLight = primaryClass.replace('-600', '-500');
  const primaryDark = primaryClass.replace('-600', '-700');
  const primaryBg = primaryClass.replace('-600', '-50');
  const primaryHover = primaryClass.replace('-600', '-100');
  const primaryText = primaryClass.replace('-600', '-700');
  const primaryBorder = primaryClass;

  return {
    primary: primaryClass,
    primaryLight,
    primaryDark,
    primaryBg,
    primaryHover,
    primaryText,
    primaryBorder,
  };
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      // Fetch branding settings from public API endpoint
      const res = await fetch('/api/branding', {
        cache: 'no-store', // Always fetch fresh branding
      });
      
      if (!res.ok) {
        console.warn('Failed to fetch branding settings:', res.status);
        setBranding(defaultBranding);
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      
      if (data.branding) {
        const brandingSettings = data.branding;
        const updatedBranding: BrandingSettings = {
          companyName: brandingSettings.companyName || defaultBranding.companyName,
          companyLogo: brandingSettings.logo || brandingSettings.companyLogo || defaultBranding.companyLogo,
          favicon: brandingSettings.favicon || defaultBranding.favicon,
          primaryColor: brandingSettings.primaryColor || defaultBranding.primaryColor,
          secondaryColor: brandingSettings.secondaryColor || defaultBranding.secondaryColor,
          description: brandingSettings.description || defaultBranding.description,
        };
        
        console.log('Loaded branding settings:', {
          companyName: updatedBranding.companyName,
          hasLogo: !!updatedBranding.companyLogo,
          primaryColor: updatedBranding.primaryColor,
        });
        
        setBranding(updatedBranding);
        
        // Update document title
        if (typeof document !== 'undefined') {
          document.title = updatedBranding.companyName || 'LMS';
        }
        
        // Update favicon - use logo if available, otherwise use default
        // Use requestAnimationFrame to ensure DOM is ready and avoid React conflicts
        if (typeof document !== 'undefined' && typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            try {
              if (!document.head) return;
              
              const faviconUrl = updatedBranding.companyLogo || updatedBranding.favicon || '/favicon.ico';
              
              // Determine MIME type based on file extension
              let mimeType = 'image/x-icon';
              if (faviconUrl.endsWith('.svg')) {
                mimeType = 'image/svg+xml';
              } else if (faviconUrl.endsWith('.png')) {
                mimeType = 'image/png';
              } else if (faviconUrl.endsWith('.jpg') || faviconUrl.endsWith('.jpeg')) {
                mimeType = 'image/jpeg';
              } else if (faviconUrl.endsWith('.webp')) {
                mimeType = 'image/webp';
              }
              
              // Safely update or create favicon link - only modify if element exists and has parent
              const updateFaviconLink = (rel: string, type: string, href: string) => {
                try {
                  const existing = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
                  if (existing && existing.parentNode) {
                    // Update existing link
                    existing.type = type;
                    existing.href = href;
                  } else if (!existing) {
                    // Create new link only if it doesn't exist
                    const link = document.createElement('link');
                    link.rel = rel;
                    link.type = type;
                    link.href = href;
                    if (document.head) {
                      document.head.appendChild(link);
                    }
                  }
                } catch (err) {
                  // Silently fail if DOM manipulation fails
                  console.warn('Failed to update favicon link:', rel, err);
                }
              };
              
              // Update favicon links
              updateFaviconLink('icon', mimeType, faviconUrl);
              updateFaviconLink('shortcut icon', mimeType, faviconUrl);
              
              // Update Apple touch icon only if logo is set
              if (updatedBranding.companyLogo) {
                updateFaviconLink('apple-touch-icon', mimeType, faviconUrl);
              }
            } catch (error) {
              // Silently fail to avoid breaking the app
              console.warn('Failed to update favicon:', error);
            }
          });
        }
      } else {
        console.warn('No branding settings found in API response');
        // Use defaults if API doesn't return branding settings
        setBranding(defaultBranding);
      }
    } catch (error) {
      console.error('Failed to fetch branding settings:', error);
      // Keep default branding on error
      setBranding(defaultBranding);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
    
    // Listen for settings changes (e.g., when admin updates branding)
    // Poll for changes every 5 seconds (more frequent for better UX)
    const interval = setInterval(() => {
      fetchBranding();
    }, 5000); // Check every 5 seconds
    
    // Listen to storage events for immediate updates (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'brandingUpdated') {
        fetchBranding();
      }
    };
    
    // Listen to custom events for same-tab updates
    const handleBrandingUpdate = () => {
      fetchBranding();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('brandingUpdated', handleBrandingUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('brandingUpdated', handleBrandingUpdate);
    };
  }, []);

  const getThemeColor = () => {
    return branding.primaryColor;
  };

  const getThemeClasses = () => {
    return hexToTailwindClasses(branding.primaryColor);
  };

  return (
    <BrandingContext.Provider 
      value={{ 
        branding, 
        loading, 
        refreshBranding: fetchBranding,
        getThemeColor,
        getThemeClasses
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}

