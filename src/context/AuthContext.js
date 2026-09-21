// src/context/AuthContext.js
// Ito ang humahawak sa "naka-login ba tayo" state ng buong app.
// Ginagamit ang AsyncStorage (parang localStorage sa web, pero para sa phone)
// para hindi mawala ang session kahit isara ang app.

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // habang chinecheck kung may saved session

  // Pagbukas ng app, tignan muna kung may naka-save nang session
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem('fitora_token');
        const savedCustomer = await AsyncStorage.getItem('fitora_customer');
        if (savedToken && savedCustomer) {
          setToken(savedToken);
          setCustomer(JSON.parse(savedCustomer));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const res = await fetch(`${API.AUTH}/customers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hindi ma-login.');

    await AsyncStorage.setItem('fitora_token', data.token);
    await AsyncStorage.setItem('fitora_customer', JSON.stringify(data.customer));
    setToken(data.token);
    setCustomer(data.customer);
  }

  async function register(fullName, email, password, phone, address, birthday) {
    const res = await fetch(`${API.AUTH}/customers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password, phone, address, birthday }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hindi ma-register.');

    await AsyncStorage.setItem('fitora_token', data.token);
    await AsyncStorage.setItem('fitora_customer', JSON.stringify(data.customer));
    setToken(data.token);
    setCustomer(data.customer);
  }

  // BAGO: pag-update ng profile (pangalan, phone, address)
  async function updateProfile(updates) {
    const res = await fetch(`${API.AUTH}/customers/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hindi ma-update ang profile.');

    const updatedCustomer = { ...customer, ...data.customer };
    await AsyncStorage.setItem('fitora_customer', JSON.stringify(updatedCustomer));
    setCustomer(updatedCustomer);
  }

  async function logout() {
    await AsyncStorage.removeItem('fitora_token');
    await AsyncStorage.removeItem('fitora_customer');
    setToken(null);
    setCustomer(null);
  }

  return (
    <AuthContext.Provider value={{ customer, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Ginagamit ito ng ibang screens para makuha ang customer info at functions
export function useAuth() {
  return useContext(AuthContext);
}