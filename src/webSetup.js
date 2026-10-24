// src/webSetup.js
// ONLY for the browser (the laptop). On a phone nothing here does anything.
// A browser window is much wider than a phone, so the app would stretch and the photos and cards would become huge.
// This keeps the app the width of a phone (at most 480 px), in the middle of the window, however wide the window is.
// It must be the FIRST import of App.js, so that it runs before the screens measure the screen.
import { Dimensions, Platform } from 'react-native';

export const WEB_MAX_WIDTH = 480; // EDIT DITO: the widest the app gets in a browser

if (Platform.OS === 'web' && !Dimensions.__fitoraPatched) {
  const original = Dimensions.get.bind(Dimensions);
  Dimensions.get = (name) => {
    const value = original(name);
    return name === 'window' || name === 'screen' ? { ...value, width: Math.min(value.width, WEB_MAX_WIDTH) } : value;
  };
  Dimensions.__fitoraPatched = true;
}