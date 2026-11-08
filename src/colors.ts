/** Tile colours, by name (stored in projects.json). Values live in styles.css as --c-<name>. */
export const COLORS = ['red', 'orange', 'amber', 'green', 'teal', 'blue', 'purple', 'pink'] as const;
export type ColorName = (typeof COLORS)[number];

export const isColor = (c: unknown): c is ColorName => typeof c === 'string' && (COLORS as readonly string[]).includes(c);
