/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Theme hover backgrounds
    'hover:bg-purple-600',
    'hover:bg-blue-600',
    'hover:bg-green-600', 
    'hover:bg-orange-600',
    'hover:bg-red-600',
    'hover:bg-indigo-600',
    'hover:bg-pink-600',
    'hover:bg-teal-600',
    // Theme button backgrounds
    'bg-purple-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-orange-600',
    'bg-red-600',
    'bg-indigo-600',
    'bg-pink-600',
    'bg-teal-600',
    // Theme button hover backgrounds
    'hover:bg-purple-700',
    'hover:bg-blue-700',
    'hover:bg-green-700',
    'hover:bg-orange-700',
    'hover:bg-red-700',
    'hover:bg-indigo-700',
    'hover:bg-pink-700',
    'hover:bg-teal-700',
    // Theme gradient backgrounds
    'bg-gradient-to-br',
    'from-purple-600',
    'to-purple-700',
    'from-blue-600',
    'to-blue-700',
    'from-green-600',
    'to-green-700',
    'from-orange-600',
    'to-orange-700',
    'from-red-600',
    'to-red-700',
    'from-indigo-600',
    'to-indigo-700',
    'from-pink-600',
    'to-pink-700',
    'from-teal-600',
    'to-teal-700',
    // Theme text colors
    'text-purple-600',
    'text-blue-600',
    'text-green-600',
    'text-orange-600', 
    'text-red-600',
    'text-indigo-600',
    'text-pink-600',
    'text-teal-600',
    // Theme hover text colors
    'hover:text-purple-600',
    'hover:text-blue-600',
    'hover:text-green-600',
    'hover:text-orange-600',
    'hover:text-red-600', 
    'hover:text-indigo-600',
    'hover:text-pink-600',
    'hover:text-teal-600',
    // Theme focus ring colors
    'focus-visible:ring-purple-200',
    'focus-visible:ring-blue-200',
    'focus-visible:ring-green-200',
    'focus-visible:ring-orange-200',
    'focus-visible:ring-red-200',
    'focus-visible:ring-indigo-200',
    'focus-visible:ring-pink-200',
    'focus-visible:ring-teal-200',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ea580c", // Orange-600 (user's preference)
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f3f4f6", // Gray-100
          foreground: "#111827", // Gray-900
        },
        destructive: {
          DEFAULT: "#ef4444", // Red-500
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f9fafb", // Gray-50
          foreground: "#6b7280", // Gray-500
        },
        accent: {
          DEFAULT: "#f3f4f6", // Gray-100
          foreground: "#111827", // Gray-900
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#111827", // Gray-900
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#111827", // Gray-900
        },
        border: "#e5e7eb", // Gray-200
        input: "#e5e7eb", // Gray-200
        ring: "#ea580c", // Orange-600
        background: "#ffffff",
        foreground: "#111827", // Gray-900
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
}

