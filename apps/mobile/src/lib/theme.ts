// PromoVote colors, shared with the website (web/landing/public/styles.css).
export const C = {
  bg: '#0a0a0f',
  surface: '#14141f',
  surface2: '#1d1d2b',
  line: 'rgba(255,255,255,0.12)',
  text: '#ffffff',
  text2: '#dcd9e8',
  muted: '#a8a5b8',
  lime: '#c6ff3d',
  ink: '#101014',
  pink: '#ff5470',
  violet: '#8b5cff',
  danger: '#ff6b6b',
};
export const R = { sm: 10, md: 14, lg: 22 };

// Brand display font (Bricolage Grotesque, SIL OFL, assets/fonts). Loaded in app/_layout.tsx.
// fontWeight stays normal: the weight is in the file, and Android falls back to the system font otherwise.
export const F = {
  display: { fontFamily: 'Bricolage-ExtraBold', fontWeight: 'normal' as const },
  displayBold: { fontFamily: 'Bricolage-Bold', fontWeight: 'normal' as const },
};
