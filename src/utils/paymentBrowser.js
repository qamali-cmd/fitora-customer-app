// src/utils/paymentBrowser.js
// Opens the GCash payment page and brings the customer back to the app afterwards.
//
// Needs two small Expo packages (install once):   npx expo install expo-linking expo-web-browser
// If they are missing, the page still opens in the phone's browser (the customer then returns by hand).

import { Linking as PhoneLinking } from 'react-native';

// The address that opens THIS app again (it is different in Expo Go and in a built app)
export function appReturnLink() {
  try {
    const ExpoLinking = require('expo-linking');
    return ExpoLinking.createURL('payment-return');
  } catch (err) {
    return null;
  }
}

// Opens the payment page. The page sends the customer back to the app when the payment is done.
// Gives back { type: 'success' } when the customer came back from the payment page.
export async function openCheckout(url) {
  let WebBrowser = null;
  try {
    WebBrowser = require('expo-web-browser');
  } catch (err) {
    WebBrowser = null;
  }

  const returnLink = appReturnLink();
  if (WebBrowser && returnLink) {
    try {
      return await WebBrowser.openAuthSessionAsync(url, returnLink);
    } catch (err) {
      // fall through: open it in the normal browser instead
    }
  }
  await PhoneLinking.openURL(url);
  return { type: 'opened' };
}