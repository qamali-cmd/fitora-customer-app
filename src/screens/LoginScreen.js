// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Awtomatikong lilipat sa Main app - tignan ang App.js
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* EDIT DITO: pangalan ng company at tagline */}
      <Text style={styles.title}>Fitora Gear</Text>
      <Text style={styles.subtitle}>Mag-login para magsimulang mamili</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Wala pang account? Mag-register</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// EDIT DITO: mga kulay ng theme mo
const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f4f5f7' },
  title: { fontSize: 32, fontWeight: 'bold', color: PRIMARY, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 14, marginBottom: 12, fontSize: 15,
  },
  button: { backgroundColor: PRIMARY, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 8, fontSize: 13 },
  link: { color: PRIMARY, textAlign: 'center', marginTop: 20, fontSize: 14 },
});