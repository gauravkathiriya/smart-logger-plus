/**
 * ANSI color codes for terminal output.
 * Provides foreground colors, background colors, and text styles.
 */
export const Colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright foreground colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
} as const;

export type ColorKey = keyof typeof Colors;

/**
 * Wraps text with an ANSI color code, automatically resetting after.
 */
export function colorize(text: string, ...colorKeys: ColorKey[]): string {
  const prefix = colorKeys.map((k) => Colors[k]).join('');
  return `${prefix}${text}${Colors.reset}`;
}

/**
 * Returns true if the current environment supports ANSI color codes.
 */
export function supportsColor(): boolean {
  // No color when piping, in CI environments, or when explicitly disabled
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (process.env['FORCE_COLOR'] !== undefined) return true;
  return process.stdout.isTTY === true;
}
