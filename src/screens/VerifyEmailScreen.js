// src/screens/VerifyEmailScreen.js
// Shown after sign-up (or login) until the customer confirms the 6-digit code sent to their email.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { customer, signupEmailSent, sendVerificationCode, verifyEmailCode, logout } = useAuth();
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(signupEmailSent === true); // the sign-up already sent one
  const [cooldown, setCooldown] = useState(signupEmailSent === true ? RESEND_SECONDS : 0);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // counts down the "resend" wait time
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSend() {
    setError('');
    setInfo('');
    setSending(true);
    try {
      await sendVerificationCode();
      setCodeSent(true);
      setCooldown(RESEND_SECONDS);
      setInfo('A new code is on its way. Check your inbox and your Spam folder.');
    } catch (err) {
      if (err.data && err.data.wait) setCooldown(err.data.wait);
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    setError('');
    setInfo('');
    setVerifying(true);
    try {
      await verifyEmailCode(code.trim());
      // the app switches to the main screens automatically once the email is verified
    } catch (err) {
      setError(err.message);
      setVerifying(false);
    }
  }

  const intro = codeSent
    ? 'We sent a 6-digit code to'
    : signupEmailSent === false
      ? 'We could not send the code yet. Tap "Send code" to try again for'
      : 'Tap "Send code" to get a 6-digit code for';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Icon name="mail-outline" size={44} color="#FC408C" />
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>{intro}</Text>
      <Text style={styles.email}>{customer?.email}</Text>

      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
        placeholder="------"
        placeholderTextColor="#ccc"
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <TouchableOpacity
        style={[styles.button, code.length !== 6 && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={code.length !== 6 || verifying}
      >
        {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSend} disabled={cooldown > 0 || sending} style={styles.linkWrap}>
        <Text style={[styles.link, (cooldown > 0 || sending) && styles.linkDisabled]}>
          {sending ? 'Sending...' : cooldown > 0 ? `Resend code in ${cooldown}s` : codeSent ? 'Resend code' : 'Send code'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.hint}>The code expires in 10 minutes. If you cannot find the email, check your Spam folder.</Text>

      <TouchableOpacity onPress={logout} style={styles.linkWrap}>
        <Text style={styles.logout}>Use a different account (log out)</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f4f5f7' },
  icon: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111111', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8 },
  email: { fontSize: 15, fontWeight: '600', color: PRIMARY, textAlign: 'center', marginBottom: 24 },
  codeInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    fontSize: 32, letterSpacing: 10, fontWeight: 'bold', color: '#111111', paddingVertical: 14, marginBottom: 12,
  },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 10, fontSize: 13 },
  info: { color: '#27ae60', textAlign: 'center', marginBottom: 10, fontSize: 13 },
  button: { backgroundColor: PRIMARY, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { backgroundColor: '#fda6c6' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkWrap: { alignItems: 'center', marginTop: 18 },
  link: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  linkDisabled: { color: '#aaa' },
  hint: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 18 },
  logout: { color: '#888', fontSize: 13, textDecorationLine: 'underline' },
});