// src/screens/ForgotPasswordScreen.js
// For a customer who forgot the password:
//   1) type the email or username, and a 6-digit code is sent to the email of the account
//   2) type the code and a new password
// It is reached from the "Forgot password?" link on the Login screen.

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Icon from '../components/Icon';
import API from '../api/config';
import { request } from '../api/http';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const RESEND_SECONDS = 60; // the server also makes you wait a minute before a new code

function PasswordField({ placeholder, value, onChangeText }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.passwordRow}>
      <TextInput placeholderTextColor="#9A9AA0"
        style={styles.passwordInput}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.eyeButton} onPress={() => setVisible((v) => !v)}>
        <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color="#8A8A8A" />
      </TouchableOpacity>
    </View>
  );
}

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('request'); // 'request' -> 'reset' -> 'done'
  const [identifier, setIdentifier] = useState(''); // email OR username
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // counts down the wait time before a new code can be asked
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(isNewCode) {
    setError('');
    setInfo('');
    const who = identifier.trim();
    if (!who) {
      setError('Please enter your email or username.');
      return;
    }
    setSending(true);
    try {
      const data = await request(`${API.AUTH}/customers/forgot-password`, { method: 'POST', body: { identifier: who } });
      setCooldown(RESEND_SECONDS);
      setInfo(isNewCode ? 'A new code was requested. Check your inbox and your Spam folder.' : data.message);
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function resetPassword() {
    setError('');
    setInfo('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError('New password must be at least 8 characters with uppercase and lowercase letters, a number, and a special character (e.g. !@#$%).');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords are not the same.');
      return;
    }
    setSaving(true);
    try {
      await request(`${API.AUTH}/customers/reset-password`, {
        method: 'POST',
        body: { identifier: identifier.trim(), code, new_password: password },
      });
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function useDifferentAccount() {
    setStep('request');
    setCode('');
    setPassword('');
    setConfirm('');
    setError('');
    setInfo('');
  }

  const goToLogin = () => navigation.navigate('Login');

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'request' && (
          <>
            <Icon name="key-outline" size={44} color="#FC408C" />
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>Type your email or username. We will send a 6-digit code to the email of your account.</Text>

            <TextInput placeholderTextColor="#9A9AA0"
              style={styles.input}
              placeholder="Email or username"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={() => sendCode(false)} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send code</Text>}
            </TouchableOpacity>

            <Text style={styles.hint}>The code is sent only to an email that was verified in the app.</Text>

            <TouchableOpacity onPress={goToLogin} style={styles.linkWrap}>
              <Text style={styles.link}>Back to log in</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'reset' && (
          <>
            <Icon name="mail-outline" size={44} color="#FC408C" />
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>Type the 6-digit code from your email, then choose a new password.</Text>

            {info ? <Text style={styles.info}>{info}</Text> : null}

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

            <PasswordField placeholder="New password" value={password} onChangeText={setPassword} />
            <PasswordField placeholder="Type the new password again" value={confirm} onChangeText={setConfirm} />
            <Text style={styles.rules}>Min. 8 characters with uppercase, lowercase, a number, and a special character</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={resetPassword} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset password</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => sendCode(true)} disabled={cooldown > 0 || sending} style={styles.linkWrap}>
              <Text style={[styles.link, (cooldown > 0 || sending) && styles.linkDisabled]}>
                {sending ? 'Sending...' : cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.hint}>The code expires in 10 minutes. If you cannot find the email, check your Spam folder.</Text>

            <TouchableOpacity onPress={useDifferentAccount} style={styles.linkWrap}>
              <Text style={styles.link}>Use a different email or username</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToLogin} style={styles.linkWrap}>
              <Text style={styles.link}>Back to log in</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'done' && (
          <>
            <Icon name="checkmark-circle" size={48} color="#1E8E4F" />
            <Text style={styles.title}>Password changed</Text>
            <Text style={styles.subtitle}>You can now log in with your new password.</Text>
            <TouchableOpacity style={styles.button} onPress={goToLogin}>
              <Text style={styles.buttonText}>Log in</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  icon: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111111', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 22 },
  input: { color: '#1F1F1F', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 12 },
  codeInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    fontSize: 32, letterSpacing: 10, fontWeight: 'bold', color: '#111111', paddingVertical: 14, marginBottom: 14,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 12,
  },
  passwordInput: { color: '#1F1F1F', flex: 1, padding: 14, fontSize: 15 },
  eyeButton: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },
  rules: { fontSize: 12, color: '#888', marginBottom: 12 },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  info: { color: '#2e8b57', textAlign: 'center', marginBottom: 14, fontSize: 13, lineHeight: 18 },
  button: { backgroundColor: PRIMARY, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 16, lineHeight: 17 },
  linkWrap: { alignItems: 'center', marginTop: 14 },
  link: { color: PRIMARY, fontSize: 14 },
  linkDisabled: { color: '#aaa' },
});