// src/api/config.js
//
// PERMANENTE na ang mga URLs na ito ngayon - naka-deploy na sa Render,
// 24/7 na online, hindi na umaasa sa computer mo o sa anumang tunnel.
//
// Isang paalala: sa Free tier ng Render, "natutulog" ang service pagkatapos
// ng 15 minutong walang ginagamit - kaya sa unang request pagkagising nito,
// maaaring mag-30-60 segundo bago ito sumagot. Normal lang ito.

const API = {
  AUTH: 'https://fitora-auth-backend.onrender.com/api/auth',
  PRODUCTS: 'https://fitora-product-service.onrender.com/api',
  ORDERS: 'https://fitora-order-service.onrender.com/api',
};

export default API;