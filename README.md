# Fitora Gear - Customer Mobile App

Ito ang customer-facing mobile app, ginawa gamit ang **React Native + Expo**.
Dito pwedeng mag-browse ng products, mag-cart, at mag-order ang mga customer.

## Bago ka magsimula

Kailangan mo:
1. [Node.js](https://nodejs.org) naka-install sa computer mo
2. **Expo Go** app na naka-download sa phone mo (available sa Play Store/App Store)
3. Ang phone mo at computer mo ay dapat **naka-connect sa parehong WiFi network**
4. Tumatakbo na ang 3 backend services (`auth-service`, `product-service`,
   `order-service`) mula sa `fitora-gear-admin` project

## Unang beses na setup

### 1. I-install ang dependencies
```bash
cd fitora-customer-app
npm install
```

### 2. I-set up ang IP address


Buksan ang `src/api/config.js`, at palitan ang `MY_COMPUTER_IP` ng totoong
IP address ng computer mo sa WiFi network (may malalim na paliwanag kung
paano makuha ito sa loob mismo ng file).

**Bakit hindi puwedeng "localhost"?** Dahil ang "localhost" sa phone mo ay
tumutukoy sa sarili niyang sarili (ang phone), hindi sa computer mo kung
saan tumatakbo ang mga backend services.

### 3. I-run ang app
```bash
npm start
```

Lalabas ang isang **QR code** sa terminal. I-scan mo ito gamit ang:
- **Android:** Expo Go app mismo (may "Scan QR code" button)
- **iPhone:** default Camera app

Mag-lo-load ang app sa phone mo sa loob ng ilang segundo.

## Paano subukan

1. Mag-register ng bagong customer account
2. Mag-browse ng products sa Home tab, mag-search, mag-filter by category
3. Pumili ng product, i-adjust ang quantity, i-**Add to Cart**
4. Pumunta sa Cart (icon sa taas), i-adjust ang quantities, i-**Checkout**
5. Ilagay ang shipping address, i-**Place order**
6. Tignan ang order sa **Orders** tab - dapat makita mo rin ito sa
   **admin panel** (Orders tab, dapat "pending" ang status)

## Paano mag-edit
Hanapin mo ang mga linyang may komentong "**EDIT DITO**" sa mga files -
dun nakatakda ang mga bagay na malamang babaguhin mo (pangalan ng company,
kulay, IP address, mga labels ng tabs).

## Project structure
```
App.js                          - navigation setup (auth flow + tabs)
src/
  api/config.js                 - API URLs (auth, product, order services)
  context/AuthContext.js        - login/register/logout state
  context/CartContext.js        - shopping cart state
  screens/
    LoginScreen.js
    RegisterScreen.js
    HomeScreen.js                - product browsing, search, filter
    ProductDetailScreen.js
    CartScreen.js
    CheckoutScreen.js
    OrderHistoryScreen.js
    AccountScreen.js
```

## Susunod na maaring gawin
- [ ] Product images (kasalukuyan: placeholder emoji lang)
- [ ] Reviews - magpasubmit ng review pagkatapos ng completed order
- [ ] Push notifications para sa order status updates
- [ ] I-publish gamit ang EAS Build (Expo) para makagawa ng totoong .apk/.ipa
