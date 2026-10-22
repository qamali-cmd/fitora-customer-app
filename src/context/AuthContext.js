// src/context/AuthContext.js
// Holds the logged-in customer for the whole app. The session is saved with AsyncStorage
// (like localStorage on the web) so the user stays logged in after closing the app.

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api/config';
import { request, setUnauthorizedHandler } from '../api/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for a saved session
  // true/false right after signing up (was the code email sent?), otherwise null
  const [signupEmailSent, setSignupEmailSent] = useState(null);

  async function saveCustomer(updated) {
    await AsyncStorage.setItem('fitora_customer', JSON.stringify(updated));
    setCustomer(updated);
  }

  async function saveSession(newToken, newCustomer) {
    await AsyncStorage.setItem('fitora_token', newToken);
    await AsyncStorage.setItem('fitora_customer', JSON.stringify(newCustomer));
    setToken(newToken);
    setCustomer(newCustomer);
  }

  async function logout() {
    await AsyncStorage.removeItem('fitora_token');
    await AsyncStorage.removeItem('fitora_customer');
    setToken(null);
    setCustomer(null);
    setSignupEmailSent(null);
  }

  // When the app opens, restore the saved session and refresh the profile from the server
  useEffect(() => {
    setUnauthorizedHandler(logout); // the server says the session is no longer valid -> log out

    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem('fitora_token');
        const savedCustomer = await AsyncStorage.getItem('fitora_customer');
        if (savedToken && savedCustomer) {
          setToken(savedToken);
          setCustomer(JSON.parse(savedCustomer));
          // Refresh in the background (also updates the "email verified" flag)
          request(`${API.AUTH}/customers/me`, { token: savedToken })
            .then((profile) => saveCustomer({ ...JSON.parse(savedCustomer), ...profile }))
            .catch(() => {});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // "identifier" can be the email OR the username
  async function login(identifier, password) {
    const data = await request(`${API.AUTH}/customers/login`, { method: 'POST', body: { identifier, password } });
    setSignupEmailSent(null);
    await saveSession(data.token, data.customer);
  }

  async function register(form) {
    const data = await request(`${API.AUTH}/customers/register`, {
      method: 'POST',
      body: {
        first_name: form.firstName,
        middle_name: form.middleName,
        last_name: form.lastName,
        username: form.username,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        birthday: form.birthday,
      },
    });
    setSignupEmailSent(data.emailSent !== false);
    await saveSession(data.token, data.customer);
  }

  // Loads the latest profile (name, photo, order count, verified flag...)
  async function refreshProfile() {
    if (!token) return null;
    const profile = await request(`${API.AUTH}/customers/me`, { token });
    await saveCustomer({ ...customer, ...profile });
    return profile;
  }

  async function updateProfile(updates) {
    const data = await request(`${API.AUTH}/customers/me`, { method: 'PUT', token, body: updates });
    await saveCustomer({ ...customer, ...data.customer });
  }

  async function sendVerificationCode() {
    return request(`${API.AUTH}/customers/me/send-code`, { method: 'POST', token });
  }

  async function verifyEmailCode(code) {
    await request(`${API.AUTH}/customers/me/verify-code`, { method: 'POST', token, body: { code } });
    setSignupEmailSent(null);
    await saveCustomer({ ...customer, emailVerified: true });
  }

  async function changePassword(currentPassword, newPassword) {
    await request(`${API.AUTH}/customers/me/password`, {
      method: 'PUT',
      token,
      body: { current_password: currentPassword, new_password: newPassword },
    });
  }

  return (
    <AuthContext.Provider
      value={{
        customer, token, loading, signupEmailSent,
        login, register, logout, refreshProfile, updateProfile,
        sendVerificationCode, verifyEmailCode, changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}