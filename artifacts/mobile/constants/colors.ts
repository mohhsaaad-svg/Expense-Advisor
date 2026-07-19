/**
 * Ember design tokens — synced from the sibling web artifact
 * (artifacts/expense-tracker/src/index.css) so both apps share
 * one warm, deliberate visual identity. No grays, no pure whites
 * except cards.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#2E241F',
    tint: '#EE5C2B',

    // Core surfaces — warm cream/sand
    background: '#FCFAF8',
    foreground: '#2E241F',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#2E241F',

    // Ember orange — primary actions
    primary: '#EE5C2B',
    primaryForeground: '#FFFFFF',

    // Soft warm taupe
    secondary: '#F1ECE4',
    secondaryForeground: '#3D3029',

    // Muted / subdued
    muted: '#F3F0ED',
    mutedForeground: '#847062',

    // Warm accent tint (selected states, highlights)
    accent: '#FDF0EC',
    accentForeground: '#BD3B0F',

    // Destructive
    destructive: '#E23636',
    destructiveForeground: '#FFFFFF',

    // Status
    success: '#29A352',
    warning: '#F49D25',

    // Borders and inputs
    border: '#ECE7DF',
    input: '#ECE7DF',
  },

  // Matches the web artifact's --radius: 1rem
  radius: 16,
};

export default colors;
