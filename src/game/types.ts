// ---- Candy types & palettes ----
export type CandyType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const CANDY_COLORS = 6;

// Muted-but-vivid candy palette (id ~ main color, accent highlight, dark shade)
export const PALETTE: {
  main: string;
  light: string;
  dark: string;
  glow: string;
  emoji: string;
}[] = [
  // 0 Red / Strawberry
  { main: "#ff4d6d", light: "#ff8aa3", dark: "#c9184a", glow: "#ff4d6d", emoji: "🍓" },
  // 1 Orange / Orange slice
  { main: "#ff9f1c", light: "#ffc15e", dark: "#e76f00", glow: "#ff9f1c", emoji: "🍊" },
  // 2 Yellow / Lemon
  { main: "#ffd60a", light: "#ffe566", dark: "#e6ae00", glow: "#ffea00", emoji: "🍋" },
  // 3 Green / Apple
  { main: "#6ebf38", light: "#9add6b", dark: "#3f8f1f", glow: "#7fe04e", emoji: "🍏" },
  // 4 Blue / Blueberry
  { main: "#3a86ff", light: "#74b3ff", dark: "#1d5fd6", glow: "#4d9bff", emoji: "🫐" },
  // 5 Purple / Grape
  { main: "#9d4edd", light: "#c77dff", dark: "#7623b3", glow: "#b475ff", emoji: "🍇" },
];

export const COLS = 8;
export const ROWS = 8;
export const CELL = 64; // logical cell size in px
export const GRAV = 2200; // px/s^2
export const MAX_FALL = 60;

export const EMPTY: CandyType = -1 as CandyType as CandyType;

export type Screen = "menu" | "playing" | "paused" | "gameover";

export type HighScore = { name: string; score: number; date: number };
