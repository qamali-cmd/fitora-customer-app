// src/utils/orderUtils.js
// Small helper functions shared by the Orders, Notifications and Me screens.

// The tabs shown on the "My Purchases" (Orders) screen
export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'toPay', label: 'To Pay' },
  { key: 'toShip', label: 'To Ship' },
  { key: 'toReceive', label: 'To Receive' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// A GCash order that is still waiting for its payment ("To Pay")
export function isAwaitingPayment(order) {
  return order.status === 'pending' && order.payment_method === 'gcash' && order.payment_status === 'awaiting_payment';
}

export function matchesFilter(order, filter) {
  switch (filter) {
    case 'toPay': return isAwaitingPayment(order);
    case 'toShip': return (order.status === 'pending' && !isAwaitingPayment(order)) || order.status === 'processing';
    case 'toReceive': return order.status === 'shipped';
    case 'completed': return order.status === 'completed';
    case 'cancelled': return order.status === 'cancelled';
    default: return true;
  }
}

export function countByFilter(orders) {
  const counts = { toPay: 0, toShip: 0, toReceive: 0, completed: 0, cancelled: 0 };
  orders.forEach((order) => {
    Object.keys(counts).forEach((key) => {
      if (matchesFilter(order, key)) counts[key] += 1;
    });
  });
  return counts;
}

// The "state" of an order that we remember: its status, plus a declined cancellation request
export function orderStateKey(order) {
  let key = order.status === 'processing' && order.cancel_request_status === 'rejected' ? 'processing:rejected' : order.status;
  // a refund moving forward is news for the customer too
  if (order.status === 'cancelled' && (order.payment_status === 'refund_pending' || order.payment_status === 'refunded')) key += ':' + order.payment_status;
  return key;
}

// An order is "unread" when its status changed since the customer last opened Notifications.
// "seen" is a map like { 12: 'pending', 13: 'shipped' } saved on the phone.
export function computeUnreadIds(orders, seen) {
  if (!seen) return [];
  return orders
    .filter((order) => (seen[order.order_id] !== undefined ? seen[order.order_id] !== orderStateKey(order) : order.status !== 'pending'))
    .map((order) => order.order_id);
}

// The message shown in Notifications for the current status of an order
export function notificationFor(order) {
  const id = order.order_id;
  switch (order.status) {
    case 'processing':
      if (order.cancel_request_status === 'rejected') {
        return { icon: 'alert-circle-outline', tone: 'amber', title: 'Cancellation request declined', text: `The seller declined your request to cancel order #${id}.${order.cancel_reject_reason ? ' ' + order.cancel_reject_reason + '.' : ''}` };
      }
      return { icon: 'cube-outline', tone: 'pink', title: 'Your order is being prepared', text: `Order #${id} is being packed by the seller.` };
    case 'shipped': {
      const via = order.courier ? ` with ${order.courier}.` : '.';
      const track = order.tracking_number ? ` Tracking number: ${order.tracking_number}.` : '';
      return { icon: 'car-outline', tone: 'pink', title: 'Your order is on its way', text: `Order #${id} was shipped${via}${track} Get ready to receive it!` };
    }
    case 'completed': return { icon: 'checkmark-circle', tone: 'green', title: 'Order completed', text: `Order #${id} was completed. Don't forget to rate your items!` };
    case 'cancelled':
      if (order.payment_status === 'refunded') {
        return { icon: 'wallet-outline', tone: 'green', title: 'Refund completed', text: `Your GCash payment for order #${id} was refunded.` };
      }
      if (order.cancelled_by === 'system') {
        return { icon: 'time-outline', tone: 'amber', title: 'Order cancelled', text: `Order #${id} was cancelled because the GCash payment was not completed in time.` };
      }
      if (order.payment_status === 'refund_pending') {
        return { icon: 'wallet-outline', tone: 'amber', title: 'Refund in progress', text: `Order #${id} was cancelled. The shop will refund your GCash payment.` };
      }
      if (order.cancelled_by === 'admin') {
        return { icon: 'close-circle-outline', tone: 'red', title: 'Order cancelled by the seller', text: `Order #${id} was cancelled by the seller.${order.cancel_reason ? ' Reason: ' + order.cancel_reason + '.' : ''}` };
      }
      if (order.cancel_request_reason) {
        return { icon: 'checkmark-circle', tone: 'green', title: 'Cancellation approved', text: `Your request to cancel order #${id} was approved.` };
      }
      return { icon: 'close-circle-outline', tone: 'red', title: 'Order cancelled', text: `You cancelled order #${id}.` };
    default: return { icon: 'receipt-outline', tone: 'pink', title: 'Order placed', text: `Order #${id} is waiting to be confirmed by the seller.` };
  }
}

// The little status tag of an order: a label, an icon, and a color
export function statusInfo(order) {
  if (isAwaitingPayment(order)) return { label: 'To Pay', icon: 'card-outline', tone: 'amber' };
  switch (order.status) {
    case 'pending': return { label: 'Pending', icon: 'time-outline', tone: 'amber' };
    case 'processing': return { label: 'Processing', icon: 'cube-outline', tone: 'pink' };
    case 'shipped': return { label: 'Shipped', icon: 'car-outline', tone: 'pink' };
    case 'completed': return { label: 'Completed', icon: 'checkmark-circle', tone: 'green' };
    case 'cancelled':
      if (order.payment_status === 'refund_pending') return { label: 'Refund in progress', icon: 'wallet-outline', tone: 'amber' };
      if (order.payment_status === 'refunded') return { label: 'Refunded', icon: 'wallet-outline', tone: 'green' };
      return { label: 'Cancelled', icon: 'close-circle-outline', tone: 'red' };
    default: return { label: String(order.status || ''), icon: 'ellipse-outline', tone: 'pink' };
  }
}

// How the customer pays: Cash on Delivery, or GCash with its state
export function paymentInfo(order) {
  if (order.payment_method === 'gcash') {
    const states = { paid: 'Paid', awaiting_payment: 'Awaiting payment', refund_pending: 'Refund in progress', refunded: 'Refunded' };
    return { icon: 'phone-portrait-outline', label: 'GCash', state: states[order.payment_status] || '' };
  }
  return { icon: 'cash-outline', label: 'Cash on Delivery', state: '' };
}