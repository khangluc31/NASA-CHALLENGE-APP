/** 10 điểm neo trong COLOR_NODES của audio.js + "mây" (độ bão hòa thấp, pha tiếng gió). */
export interface Swatch {
  name: string;
  hue: number;
  sat: number;
  light: number;
}

const s = (name: string, hue: number, sat: number, light: number): Swatch => ({ name, hue, sat, light });

export const SWATCHES: readonly Swatch[] = [
  s("red deep 0°", 0, 0.9, 0.8),
  s("orange earth 30°", 30, 0.9, 0.8),
  s("yellow vibrant 58°", 58, 0.9, 0.9),
  s("yellow citrus 85°", 85, 0.8, 0.8),
  s("green leaf 130°", 130, 0.8, 0.7),
  s("green jade 165°", 165, 0.8, 0.7),
  s("cyan 195°", 195, 0.8, 0.8),
  s("blue deep 230°", 230, 0.8, 0.6),
  s("purple 275°", 275, 0.7, 0.7),
  s("pink 325°", 325, 0.8, 0.8),
  s("cloud (neutral)", 0, 0.05, 0.95),
];
