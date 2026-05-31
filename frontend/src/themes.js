/**
 * ESP32 OTA Dashboard — Theme Collection
 * Tambah tema baru dengan menambah entry baru di object THEMES
 */

export const THEMES = {

  // ── 1. Cyber Dark (Default) ──────────────────────────────────────────────
  cyber_dark: {
    name: "Cyber Dark",
    icon: "⚡",
    bg:       "#0a0e17",
    surface:  "#111827",
    border:   "#1f2d45",
    accent:   "#00d4ff",
    accent2:  "#7c3aed",
    success:  "#10b981",
    warning:  "#f59e0b",
    danger:   "#ef4444",
    text:     "#e2e8f0",
    muted:    "#64748b",
    cardBg:   "#070b12",
    headerBg: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,212,255,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(124,58,237,0.06) 0%, transparent 50%)",
  },

  // ── 2. Matrix Green ───────────────────────────────────────────────────────
  matrix: {
    name: "Matrix",
    icon: "🟩",
    bg:       "#020c02",
    surface:  "#061006",
    border:   "#0d2e0d",
    accent:   "#00ff41",
    accent2:  "#00cc33",
    success:  "#00ff41",
    warning:  "#ffff00",
    danger:   "#ff3300",
    text:     "#ccffcc",
    muted:    "#2d6b2d",
    cardBg:   "#030803",
    headerBg: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,255,65,0.07) 0%, transparent 60%)",
  },

  // ── 3. Sunset Orange ─────────────────────────────────────────────────────
  sunset: {
    name: "Sunset",
    icon: "🌅",
    bg:       "#0f0a00",
    surface:  "#1a1000",
    border:   "#3d2200",
    accent:   "#ff8c00",
    accent2:  "#ff4500",
    success:  "#22c55e",
    warning:  "#fbbf24",
    danger:   "#ef4444",
    text:     "#fef3c7",
    muted:    "#78543a",
    cardBg:   "#100b00",
    headerBg: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,140,0,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(255,69,0,0.07) 0%, transparent 50%)",
  },

  // ── 4. Arctic Blue ────────────────────────────────────────────────────────
  arctic: {
    name: "Arctic",
    icon: "❄️",
    bg:       "#010d1a",
    surface:  "#051525",
    border:   "#0a2a45",
    accent:   "#38bdf8",
    accent2:  "#0ea5e9",
    success:  "#34d399",
    warning:  "#fbbf24",
    danger:   "#f87171",
    text:     "#e0f2fe",
    muted:    "#3b6b8a",
    cardBg:   "#020e1c",
    headerBg: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(14,165,233,0.06) 0%, transparent 50%)",
  },

  // ── 5. Rose Gold ──────────────────────────────────────────────────────────
  rose_gold: {
    name: "Rose Gold",
    icon: "🌸",
    bg:       "#0f0509",
    surface:  "#1a0a10",
    border:   "#3d1525",
    accent:   "#fb7185",
    accent2:  "#e11d48",
    success:  "#4ade80",
    warning:  "#fbbf24",
    danger:   "#f43f5e",
    text:     "#ffe4e6",
    muted:    "#7a3a4a",
    cardBg:   "#0f0408",
    headerBg: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251,113,133,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(225,29,72,0.07) 0%, transparent 50%)",
  },

  // ── 6. Light Mode ─────────────────────────────────────────────────────────
  light: {
    name: "Light",
    icon: "☀️",
    bg:       "#f1f5f9",
    surface:  "#ffffff",
    border:   "#e2e8f0",
    accent:   "#0284c7",
    accent2:  "#7c3aed",
    success:  "#16a34a",
    warning:  "#d97706",
    danger:   "#dc2626",
    text:     "#0f172a",
    muted:    "#94a3b8",
    cardBg:   "#f8fafc",
    headerBg: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(2,132,199,0.06) 0%, transparent 60%)",
  },

  // ── 7. Dracula ────────────────────────────────────────────────────────────
  dracula: {
    name: "Dracula",
    icon: "🧛",
    bg:       "#282a36",
    surface:  "#1e1f29",
    border:   "#44475a",
    accent:   "#bd93f9",
    accent2:  "#ff79c6",
    success:  "#50fa7b",
    warning:  "#f1fa8c",
    danger:   "#ff5555",
    text:     "#f8f8f2",
    muted:    "#6272a4",
    cardBg:   "#21222c",
    headerBg: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(189,147,249,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(255,121,198,0.06) 0%, transparent 50%)",
  },

  // ── 8. Nord ───────────────────────────────────────────────────────────────
  nord: {
    name: "Nord",
    icon: "🏔️",
    bg:       "#2e3440",
    surface:  "#3b4252",
    border:   "#4c566a",
    accent:   "#88c0d0",
    accent2:  "#81a1c1",
    success:  "#a3be8c",
    warning:  "#ebcb8b",
    danger:   "#bf616a",
    text:     "#eceff4",
    muted:    "#4c566a",
    cardBg:   "#2e3440",
    headerBg: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(136,192,208,0.08) 0%, transparent 60%)",
  },
};

export const DEFAULT_THEME = "cyber_dark";

export function getThemeCSS(theme) {
  return `
    :root {
      --bg:      ${theme.bg};
      --surface: ${theme.surface};
      --border:  ${theme.border};
      --accent:  ${theme.accent};
      --accent2: ${theme.accent2};
      --success: ${theme.success};
      --warning: ${theme.warning};
      --danger:  ${theme.danger};
      --text:    ${theme.text};
      --muted:   ${theme.muted};
      --card-bg: ${theme.cardBg};
      --mono: 'JetBrains Mono', monospace;
      --sans: 'Syne', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;800&display=swap');
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      min-height: 100vh;
      padding: 1.5rem 1rem;
      background-image: ${theme.headerBg};
    }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes spin    { to{transform:rotate(360deg)} }
    @keyframes toast-in{ from{transform:translateY(100px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
  `;
}