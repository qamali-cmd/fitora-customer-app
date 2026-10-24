// src/context/MessageContext.js
// Keeps the number of replies of the shop that the customer has not read yet (for the little number on the chat icon).
// It asks the server every 30 seconds while the customer is logged in.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import API from '../api/config';
import { useAuth } from './AuthContext';

const MessageContext = createContext({ unread: 0, refreshUnread: async () => {}, setUnread: () => {} });
const POLL_MS = 30 * 1000;

export function MessageProvider({ children }) {
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const refreshUnread = useCallback(async () => {
    if (!tokenRef.current) { setUnread(0); return; }
    try {
      const res = await fetch(`${API.ORDERS}/orders/messages/my/unread`, { headers: { Authorization: `Bearer ${tokenRef.current}` } });
      const data = await res.json();
      if (res.ok) setUnread(Number(data.unread) || 0);
    } catch (err) {
      // not important: the number stays as it was
    }
  }, []);

  useEffect(() => {
    if (!token) { setUnread(0); return undefined; }
    refreshUnread();
    const timer = setInterval(refreshUnread, POLL_MS);
    return () => clearInterval(timer);
  }, [token, refreshUnread]);

  return <MessageContext.Provider value={{ unread, refreshUnread, setUnread }}>{children}</MessageContext.Provider>;
}

export const useMessages = () => useContext(MessageContext);