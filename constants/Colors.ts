// theme.ts — Super Tasky color system (Material 3 inspired, Expo compatible)

export const theme = {
  radius: {
    sm: 6,   // subtle rounding for buttons / inputs
    md: 8,   // default card / surface radius
    lg: 12,  // modal / sheet corners
    xl: 16,  // large containers, FABs
  },

  light: {
    background: "#F8FAFC",             // soft blue-gray background
    foreground: "#1E293B",             // deep slate text
    card: "#FFFFFF",                   // elevated surfaces
    cardForeground: "#1E293B",
    popover: "#FFFFFF",
    popoverForeground: "#1E293B",

    success: "#16A34A",
    successForeground: "#FFFFFF",

    primary: "#5B4BFF",                // Super Tasky primary violet
    primaryForeground: "#FFFFFF",
    secondary: "#10B981",              // mint-teal accent for success/positivity
    secondaryForeground: "#FFFFFF",

    muted: "#F1F5F9",                  // soft background sections
    mutedForeground: "#64748B",
    accent: "#FACC15",                 // amber highlight for actions/priority
    accentForeground: "#1E293B",
    destructive: "#EF4444",

    border: "#E2E8F0",
    input: "#E2E8F0",
    ring: "#94A3B8",

    chart1: "#5B4BFF",
    chart2: "#10B981",
    chart3: "#FACC15",
    chart4: "#F97316",
    chart5: "#6366F1",

    sidebar: "#EEF2FF",
    sidebarForeground: "#1E293B",
    sidebarPrimary: "#5B4BFF",
    sidebarPrimaryForeground: "#FFFFFF",
    sidebarAccent: "#C7D2FE",
    sidebarAccentForeground: "#1E293B",
    sidebarBorder: "#E2E8F0",
    sidebarRing: "#A5B4FC",
  },

  dark: {
    background: "#0F172A",             // deep navy background
    foreground: "#F1F5F9",             // near-white text
    card: "#1E293B",
    cardForeground: "#F8FAFC",
    popover: "#1E293B",
    popoverForeground: "#F8FAFC",

    success: "#22C55E",
    successForeground: "#000000",

    primary: "#A5B4FC",                // light violet
    primaryForeground: "#0F172A",
    secondary: "#34D399",              // bright mint
    secondaryForeground: "#0F172A",

    muted: "#334155",
    mutedForeground: "#CBD5E1",
    accent: "#FACC15",
    accentForeground: "#0F172A",
    destructive: "#F87171",

    border: "#1E293B",
    input: "#334155",
    ring: "#64748B",

    chart1: "#A5B4FC",
    chart2: "#34D399",
    chart3: "#FACC15",
    chart4: "#FB923C",
    chart5: "#818CF8",

    sidebar: "#1E1B4B",
    sidebarForeground: "#E2E8F0",
    sidebarPrimary: "#6366F1",
    sidebarPrimaryForeground: "#FFFFFF",
    sidebarAccent: "#312E81",
    sidebarAccentForeground: "#E2E8F0",
    sidebarBorder: "#1E293B",
    sidebarRing: "#6366F1",
  },
};
