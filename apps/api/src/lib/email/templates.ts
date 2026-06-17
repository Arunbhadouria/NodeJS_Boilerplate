export const TEMPLATES = {
  WELCOME: "welcome",
} as const;

export type Template = (typeof TEMPLATES)[keyof typeof TEMPLATES];