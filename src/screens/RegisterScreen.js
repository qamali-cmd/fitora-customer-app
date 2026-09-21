// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

// EDIT DITO: kung gusto mong baguhin ang password rules, i-update din ang
// parehong regex sa backend (services/auth-service/server.js)
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Simpleng format check para sa birthday: YYYY-MM-DD
const BIRTHDAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [birthday, setBirthday] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');

    if (!fullName || !email || !password || !phone || !birthday) {
      setError('Kailangan ng pangalan, email, password, phone number, at birthday.');
      return;
    }

    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError('Dapat hindi bababa sa 8 characters ang password, may malaki/maliit na letra, numero, at special character (hal. !@#$%).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hindi magkatugma ang password at confirm password.');
      return;
    }

    if (!BIRTHDAY_REGEX.test(birthday)) {
      setError('Ilagay ang birthday sa format na YYYY-MM-DD (hal. 2000-05-14).');
      return;
    }

    setLoading(true);
    try {
      await register(fullName.trim(), email.trim(), password, phone.trim(), address.trim(), birthday);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Gumawa ng account</Text>
        <Text style={styles.subtitle}>Sa Fitora Gear, madaling mamili ng accessories</Text>

        <TextInput style={styles.input} placeholder="Buong pangalan" value={fullName} onChangeText={setFullName} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(v => !v)}>
            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Min. 8 characters, may malaki/maliit na letra, numero, at special character</Text>

        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(v => !v)}>
            <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TextInput style={styles.input} placeholder="Address (optional)" value={address} onChangeText={setAddress} />
        <TextInput
          style={styles.input}
          placeholder="Birthday (YYYY-MM-DD)"
          value={birthday}
          onChangeText={setBirthday}
          keyboardType="numbers-and-punctuation"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Mag-register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>May account ka na? Mag-login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  scrollContent: { padding: 24, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2B2140', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 28, marginTop: 4 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 14, marginBottom: 12, fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 4,
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 15 },
  eyeButton: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },
  hint: { fontSize: 11, color: '#888', marginBottom: 12, marginTop: 2 },
  button: { backgroundColor: PRIMARY, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 8, fontSize: 13 },
  link: { color: PRIMARY, textAlign: 'center', marginTop: 20, fontSize: 14 },
});