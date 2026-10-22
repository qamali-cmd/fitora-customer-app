// src/context/NotificationContext.js
// Keeps the customer's orders up to date (every minute and when the app is opened again)
// and works out which order updates are new. Used by the Notifications tab, the tab badge, and the Me page.

import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api/config';
import { request } from '../api/http';
import { useAuth } from './AuthContext';
import { computeUnreadIds, orderStateKey } from '../utils/orderUtils';

const NotificationContext = createContext(null);
const POLL_MS = 60000;

export function NotificationProvider({ children }) {
  const { token, customer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [seen, setSeen] = useState(null); // { [orderId]: the status the customer already saw }
  const seenRef = useRef(null);
  const ordersRef = useRef([]);
  const storageKey = customer ? `fitora_seen_${customer.id}` : null;

  async function persist(map) {
    seenRef.current = map;
    setSeen(map);
    if (storageKey) await AsyncStorage.setItem(storageKey, JSON.stringify(map));
  }

  const refresh = useCallback(async () => {
    if (!token || !storageKey) return;
    try {
      const data = await request(`${API.ORDERS}/orders/my`, { token });
      const list = Array.isArray(data) ? data : [];
      ordersRef.current = list;
      setOrders(list);

      let map = seenRef.current;
      if (map === null) {
        const saved = await AsyncStorage.getItem(storageKey);
        map = saved ? JSON.parse(saved) : null;
      }

      let changed = false;
      if (map === null) {
        // First time on this phone: everything that exists now counts as already seen
        map = {};
        list.forEach((order) => { map[order.order_id] = orderStateKey(order); });
        changed = true;
      } else {
        // A brand-new pending order (the customer just placed it) is not a notification
        list.forEach((order) => {
          if (map[order.order_id] === undefined && order.status === 'pending') {
            map = { ...map, [order.order_id]: orderStateKey(order) };
            changed = true;
          }
        });
      }
      if (changed || seenRef.current === null) await persist(map);
    } catch (err) {
      // keep the old data; the screens show their own errors
    }
  }, [token, storageKey]);

  // Start (and restart after login/logout) the automatic refresh
  useEffect(() => {
    seenRef.current = null;
    ordersRef.current = [];
    setSeen(null);
    setOrders([]);
    if (!token) return undefined;

    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [token, storageKey, refresh]);

  // Called when the customer opens the Notifications tab
  async function markAllSeen() {
    const map = { ...(seenRef.current || {}) };
    ordersRef.current.forEach((order) => { map[order.order_id] = orderStateKey(order); });
    await persist(map);
  }

  const unreadIds = computeUnreadIds(orders, seen);

  return (
    <NotificationContext.Provider value={{ orders, unreadIds, unreadCount: unreadIds.length, refresh, markAllSeen }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}