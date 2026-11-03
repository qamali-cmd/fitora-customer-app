// src/utils/refundUtils.js
// The rules and the small calculations of the refund request (the screen uses them, and they are easy to test).
// The same rules are checked again by the order service, so the phone only helps the customer to see the problem early.

export const REFUND_WINDOW_DAYS = 7; // EDIT DITO: must be the same number as REFUND_WINDOW_DAYS in the order service
export const MAX_REFUND_PHOTOS = 3;
export const MIN_DETAILS = 10;
export const MAX_DETAILS = 1000;

export const REFUND_REASONS = [
  { key: 'defective', label: 'Defective item' },
  { key: 'damaged', label: 'Damaged on arrival' },
  { key: 'wrong_item', label: 'Wrong item received' },
  { key: 'not_as_described', label: 'Not as described' },
  { key: 'missing_parts', label: 'Missing parts' },
];

// The last day to ask for a refund (the day the customer pressed "Order Received" plus 7 days); null when it is not known
export function refundDeadline(order) {
  if (!order || !order.received_at) return null;
  const time = new Date(order.received_at).getTime();
  return Number.isNaN(time) ? null : new Date(time + REFUND_WINDOW_DAYS * 86400000);
}

// Should the phone show the "Request refund" button? (the order service has the last word)
export function canRequestRefund(order, now = Date.now()) {
  if (!order || order.status !== 'completed' || order.payment_status !== 'paid' || order.refund_request_status) return false;
  const deadline = refundDeadline(order);
  return !deadline || now <= deadline.getTime();
}

export function daysLeftText(deadline, now = Date.now()) {
  if (!deadline) return '';
  const left = new Date(deadline).getTime() - now;
  if (Number.isNaN(left) || left <= 0) return '';
  const days = Math.ceil(left / 86400000);
  return days <= 1 ? 'Today is the last day to ask for a refund.' : `You have ${days} days left to ask for a refund.`;
}

// selection is { order_item_id: quantity } for the items the customer chose
export function selectedLines(items, selection) {
  return (items || [])
    .filter((item) => selection && Number(selection[item.order_item_id]) > 0)
    .map((item) => ({ order_item_id: item.order_item_id, quantity: Number(selection[item.order_item_id]) }));
}

// The money to give back: the price of the chosen items (the shipping fee is not included)
export function refundTotal(items, selection) {
  const sum = (items || []).reduce((total, item) => total + (Number(selection && selection[item.order_item_id]) > 0 ? Number(item.price) * Number(selection[item.order_item_id]) : 0), 0);
  return Math.round(sum * 100) / 100;
}

// A message for the customer when something is missing, or '' when the request is ready to send
export function validateRefund({ reason, details, photoCount, lines }) {
  const text = String(details || '').trim();
  if (!lines || lines.length === 0) return 'Please choose the items with a problem.';
  if (!reason) return 'Please choose the reason.';
  if (text.length < MIN_DETAILS) return `Please describe the problem (at least ${MIN_DETAILS} letters).`;
  if (text.length > MAX_DETAILS) return 'The description can have at most 1,000 letters.';
  if (!photoCount || photoCount < 1) return 'Please add at least 1 photo of the problem.';
  if (photoCount > MAX_REFUND_PHOTOS) return `You can add up to ${MAX_REFUND_PHOTOS} photos.`;
  return '';
}

// How a request looks to the customer (the tag and the sentence under it)
export function refundStatusInfo(status, order) {
  const cod = order && order.payment_method === 'cod';
  switch (status) {
    case 'approved':
      return { label: 'Refund approved', icon: 'checkmark-circle', tone: 'green', hint: cod ? 'The shop approved your request. The shop will message you to ask where to send the money.' : 'The shop approved your request. The money will be sent to your GCash account.' };
    case 'refunded':
      return { label: 'Refunded', icon: 'wallet-outline', tone: 'green', hint: 'The shop sent your refund.' };
    case 'rejected':
      return { label: 'Refund declined', icon: 'close-circle-outline', tone: 'red', hint: 'The shop declined your request.' };
    default:
      return { label: 'Refund requested', icon: 'time-outline', tone: 'amber', hint: 'The shop is reviewing your request. You will see the answer here.' };
  }
}