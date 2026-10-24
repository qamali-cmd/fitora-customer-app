// src/utils/payOrder.js
// Pays an order with GCash from the list of orders: asks the server for the payment page, opens it, and when the customer
// comes back, asks the server if the payment arrived. (It is the same steps as the "Pay with GCash" button of the order page.)
import API from '../api/config';
import { request } from '../api/http';
import { appReturnLink, openCheckout } from './paymentBrowser';

// Gives back { status }: 'already_paid', 'paid', 'back' (the customer came back; the payment is not confirmed yet), or 'none'.
export async function payForOrder({ token, orderId }) {
  const result = await request(`${API.ORDERS}/orders/my/${orderId}/pay`, { method: 'POST', token, body: { app_return_url: appReturnLink() } });
  if (result.payment_status === 'paid') return { status: 'already_paid' };
  if (!result.checkout_url) return { status: 'none' };
  await openCheckout(result.checkout_url);
  let verified = null;
  try {
    verified = await request(`${API.ORDERS}/orders/my/${orderId}/payment/verify`, { method: 'POST', token });
  } catch (err) {
    verified = null; // not important: the customer can look at the order again
  }
  return { status: verified && verified.payment_status === 'paid' ? 'paid' : 'back' };
}