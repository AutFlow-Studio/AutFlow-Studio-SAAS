/**
 * Deterministic avatar color generator.
 * Given a name string, returns a consistent background/text color pair
 * that always has good contrast — never white-on-white or black-on-black.
 */

const PALETTE: { bg: string; text: string }[] = [
  { bg: "#4F46E5", text: "#fff" }, // indigo
  { bg: "#7C3AED", text: "#fff" }, // violet
  { bg: "#2563EB", text: "#fff" }, // blue
  { bg: "#0891B2", text: "#fff" }, // cyan
  { bg: "#059669", text: "#fff" }, // emerald
  { bg: "#16A34A", text: "#fff" }, // green
  { bg: "#D97706", text: "#fff" }, // amber
  { bg: "#EA580C", text: "#fff" }, // orange
  { bg: "#DC2626", text: "#fff" }, // red
  { bg: "#DB2777", text: "#fff" }, // pink
  { bg: "#9333EA", text: "#fff" }, // purple
  { bg: "#0F766E", text: "#fff" }, // teal
];

export function getAvatarColor(name: string): { bg: string; text: string } {
  if (!name) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[Math.abs(hash)];
}
