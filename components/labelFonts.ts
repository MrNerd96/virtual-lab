// Fonts for 3D <Text> labels, served from the site itself. Without an explicit font, drei's <Text>
// downloads one from an external CDN the first time a label appears (and the scene waits for it).
// Roboto (Apache-2.0), Latin subset, from @fontsource/roboto.
export const LABEL_FONT = `${import.meta.env.BASE_URL}fonts/roboto-latin-400-normal.woff`;
export const LABEL_FONT_BOLD = `${import.meta.env.BASE_URL}fonts/roboto-latin-700-normal.woff`;
