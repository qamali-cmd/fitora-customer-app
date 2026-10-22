// src/screens/RegisterScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import API from '../api/config';
import { request } from '../api/http';
import { useAuth } from '../context/AuthContext';
import BirthdayPicker from '../components/BirthdayPicker';

// Keep these rules the same as the ones on the server (services/auth-service/server.js)
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .'-]{0,49}$/;
const USERNAME_REGEX = /^[a-z0-9._]{4,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function isValidUsername(value) {
  return USERNAME_REGEX.test(value) && /[a-z]/.test(value);
}

function isRealDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function PasswordField({ placeholder, value, onChangeText }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.passwordRow}>
      <TextInput
        style={styles.passwordInput}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.eyeButton} onPress={() => setVisible((v) => !v)}>
        <Text style={styles.eyeIcon}>{visible ? '🙈' : '👁️'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken' | 'invalid'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const checkCounter = useRef(0);

  // Checks if the username is free, half a second after the user stops typing
  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!value) {
      setUsernameStatus(null);
      return undefined;
    }
    if (!isValidUsername(value)) {
      setUsernameStatus('invalid');
      return undefined;
    }
    setUsernameStatus('checking');
    const myCheck = ++checkCounter.current;
    const timer = setTimeout(async () => {
      try {
        const data = await request(`${API.AUTH}/customers/username-available?username=${encodeURIComponent(value)}`);
        if (myCheck === checkCounter.current) setUsernameStatus(data.available ? 'available' : 'taken');
      } catch (err) {
        if (myCheck === checkCounter.current) setUsernameStatus(null); // the server will check again when registering
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  async function handleRegister() {
    setError('');
    const first = firstName.trim();
    const middle = middleName.trim();
    const last = lastName.trim();
    const user = username.trim().toLowerCase();
    const mail = email.trim().toLowerCase();

    if (!first || !last || !user || !mail || !password || !phone.trim() || !birthday) {
      setError('First name, last name, username, email, password, phone number, and birthday are required.');
      return;
    }
    if (!NAME_REGEX.test(first) || !NAME_REGEX.test(last) || (middle && !NAME_REGEX.test(middle))) {
      setError("Names can only contain letters, spaces, and . ' - (up to 50 characters).");
      return;
    }
    if (!isValidUsername(user)) {
      setError('Username must be 4-20 characters: lowercase letters, numbers, dot, or underscore (with at least one letter).');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('This username is already taken. Please choose another one.');
      return;
    }
    if (!EMAIL_REGEX.test(mail)) {
      setError('Please enter a valid email address. We will send a verification code to it.');
      return;
    }
    if (!/^\+?\d{7,15}$/.test(phone.replace(/[\s()-]/g, ''))) {
      setError('Please enter a valid phone number (7-15 digits).');
      return;
    }
    if (!isRealDate(birthday)) {
      setError('Please choose your birthday from the calendar (you must be at least 13 years old).');
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError('Password must be at least 8 characters with uppercase and lowercase letters, a number, and a special character (e.g. !@#$%).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: first, middleName: middle, lastName: last, username: user, email: mail,
        password, phone: phone.trim(), address: address.trim(), birthday,
      });
      // After this the app shows the "Verify your email" screen automatically
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusText = {
    checking: { text: 'Checking...', style: styles.statusNeutral },
    available: { text: '✓ Username is available', style: styles.statusOk },
    taken: { text: '✗ Username is already taken', style: styles.statusBad },
    invalid: { text: '4-20 characters: lowercase letters, numbers, . or _', style: styles.statusNeutral },
  }[usernameStatus];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Create an account</Text>
        <Text style={styles.subtitle}>Shopping for accessories is easy with Fitora Gear</Text>

        <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
        <TextInput style={styles.input} placeholder="Middle name (optional)" value={middleName} onChangeText={setMiddleName} />
        <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {statusText ? <Text style={[styles.status, statusText.style]}>{statusText.text}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email (we will send a verification code)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput style={styles.input} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <BirthdayPicker value={birthday} onChange={setBirthday} placeholder="Birthday (tap to choose)" />
        <TextInput style={styles.input} placeholder="Address (optional)" value={address} onChangeText={setAddress} />

        <PasswordField placeholder="Password" value={password} onChangeText={setPassword} />
        <Text style={styles.hint}>Min. 8 characters with uppercase, lowercase, a number, and a special character</Text>
        <PasswordField placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111111', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24, marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 12 },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 6,
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 15 },
  eyeButton: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },
  hint: { fontSize: 11, color: '#888', marginBottom: 12 },
  status: { fontSize: 12, marginTop: -6, marginBottom: 12, marginLeft: 4 },
  statusOk: { color: '#27ae60' },
  statusBad: { color: '#e74c3c' },
  statusNeutral: { color: '#888' },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  button: { backgroundColor: PRIMARY, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: 18 },
  linkText: { color: PRIMARY, fontSize: 14 },
});