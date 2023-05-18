import { ColorResolvable } from "discord.js";

// Comments beside colours are TailwindCSS default colour palette values.
// https://tailwindcss.com/docs/customizing-colors#default-color-palette

export type Colours = {
  primary: ColorResolvable;
  sky: ColorResolvable;
  success: ColorResolvable;
  error: ColorResolvable;
  warning: ColorResolvable;
  cyan: ColorResolvable;
  blue: ColorResolvable;
  fuchsia: ColorResolvable;
  pink: ColorResolvable;
};

const colours: Colours = {
  primary: "#fcd34d", // Amber 300
  sky: "#51ade5", // BSR Sky
  success: "#22c55e", // Green 500
  error: "#ef4444", // Red 600
  warning: "#facc15", // Yellow 400
  cyan: "#22d3ee", // Cyan 400
  blue: "#2563eb", // Blue 600
  fuchsia: "#d946ef", // Fuchsia 500
  pink: "#db2777", // Pink 600
};

export default colours;
