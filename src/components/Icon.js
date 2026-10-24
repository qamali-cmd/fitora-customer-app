// src/components/Icon.js
// ONE place for every icon of the app (modern line icons from Ionicons, which comes with Expo).
// If an icon name is ever wrong, a small circle is shown instead of a broken picture or a crash.
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const FALLBACK = 'ellipse-outline';

export default function Icon({ name, size = 22, color = COLORS.ink, style }) {
  const known = Ionicons.glyphMap && Ionicons.glyphMap[name];
  return <Ionicons name={known ? name : FALLBACK} size={size} color={color} style={style} />;
}