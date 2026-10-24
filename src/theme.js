// src/theme.js
// The colors of the whole app (the Fitora theme), in one place.
// EDIT DITO: palitan ang kulay dito kung gusto mong baguhin ang buong app.
export const COLORS = {
  primary: '#FC408C',       // hot pink (main color)
  primaryDark: '#E22E78',
  primarySoft: '#FFE8F1',
  primaryTint: '#FFF4F8',
  ink: '#111111',
  text: '#222222',
  muted: '#8A8A8A',
  line: '#EEEEEE',
  bg: '#F5F5F7',
  card: '#FFFFFF',
  danger: '#E5584A',
  success: '#1E8E4F',
  warning: '#F0A53A',
  star: '#FFB400',
};

// a soft pink glow (used on the tab bar and on the banners)
export const GLOW = { shadowColor: '#FC408C', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 };

// The look of the bottom bar (dark, with round top corners and a pink glow). App.js uses it.
export const TAB_BAR_STYLE = {
  backgroundColor: '#0d0d0d',
  borderTopWidth: 0,
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
  paddingTop: 6,
  elevation: 20,
  shadowColor: '#FC408C',
  shadowOpacity: 0.3,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: -4 },
};

// The colors of the little status tags and of the round icons (a text color and a soft background)
export const TONES = {
  pink: { fg: '#E22E78', bg: '#FFE8F1' },
  amber: { fg: '#B9770E', bg: '#FFF3D6' },
  green: { fg: '#1E8E4F', bg: '#E3F7EA' },
  red: { fg: '#D6453A', bg: '#FDE9E7' },
};

export const peso = (value) => '\u20B1' + Number(value || 0).toLocaleString();