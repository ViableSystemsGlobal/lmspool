import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useTheme } from "@/contexts/theme-context"

// Helper function to get theme-based button classes
const getThemeButtonClasses = (theme: any) => {
  // Add safety check for undefined theme
  if (!theme || !theme.primary) {
    return 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-200';
  }
  
  const colorMap: { [key: string]: string } = {
    'purple-600': 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-200',
    'blue-600': 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-200',
    'green-600': 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-200',
    'orange-600': 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-200',
    'red-600': 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-200',
    'indigo-600': 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-200',
    'pink-600': 'bg-pink-600 hover:bg-pink-700 focus-visible:ring-pink-200',
    'teal-600': 'bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-200',
  };
  
  return colorMap[theme.primary] || 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-200';
};

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
      variants: {
        variant: {
          default: "text-white shadow-sm hover:shadow-md",
          destructive:
            "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md",
          outline:
            "border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 shadow-sm hover:shadow-md",
          secondary:
            "bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm hover:shadow-md",
          ghost: "hover:bg-gray-100 hover:text-gray-900 text-gray-600",
          link: "underline-offset-4 hover:underline text-gray-900",
        },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size, asChild = false, style, ...props }, ref) => {
    const { getThemeColor } = useTheme()
    const Comp = asChild ? Slot : "button"
    
    // Get theme color for default variant
    const themeColor = getThemeColor()
    
    // For default variant, use inline style to ensure color always shows
    // Convert hex color to hover color (darker version)
    const getHoverColor = (hex: string) => {
      try {
        const num = parseInt(hex.replace('#', ''), 16)
        const r = Math.max(0, Math.min(255, (num >> 16) - 20))
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - 20))
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) - 20))
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
      } catch {
        // Fallback to a darker shade if parsing fails
        return '#d97706' // orange-700
      }
    }
    const hoverColor = getHoverColor(themeColor)
    
    // For default variant, apply inline styles with theme color
    const buttonStyle = variant === "default" || variant === undefined
      ? {
          ...style,
          backgroundColor: themeColor,
          color: '#ffffff',
        }
      : style
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className })
        )}
        style={buttonStyle}
        onMouseEnter={(e: any) => {
          if ((variant === "default" || variant === undefined) && e.currentTarget) {
            e.currentTarget.style.backgroundColor = hoverColor
          }
          props.onMouseEnter?.(e)
        }}
        onMouseLeave={(e: any) => {
          if ((variant === "default" || variant === undefined) && e.currentTarget) {
            e.currentTarget.style.backgroundColor = themeColor
          }
          props.onMouseLeave?.(e)
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

