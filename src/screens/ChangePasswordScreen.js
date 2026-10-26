// src/screens/ChangePasswordScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

// Keep this rule the same as the one on the server (services/auth-service/server.js)
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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

export default function ChangePasswordScreen({ navigation }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSave() {
    setError('');
    if (!current || !next || !confirm) {
      setError('Please fill in all three fields.');
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(next)) {
      setError('New password must be at least 8 characters with uppercase and lowercase letters, a number, and a special character (e.g. !@#$%).');
      return;
    }
    if (next !== confirm) {
      setError('The new password and the confirmation do not match.');
      return;
    }
    if (next === current) {
      setError('The new password must be different from your current password.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(current, next);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Current password</Text>
      <PasswordField placeholder="Current password" value={current} onChangeText={setCurrent} />

      <Text style={styles.label}>New password</Text>
      <PasswordField placeholder="New password" value={next} onChangeText={setNext} />
      <Text style={styles.hint}>Min. 8 characters with uppercase, lowercase, a number, and a special character</Text>

      <Text style={styles.label}>Confirm new password</Text>
      <PasswordField placeholder="Confirm new password" value={confirm} onChangeText={setConfirm} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {done ? <Text style={styles.success}>✓ Your password was changed.</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change password</Text>}
      </TouchableOpacity>

      {done ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>Back to account</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 20 },
  label: { fontSize: 13, color: '#555', marginBottom: 6, marginTop: 14 },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
  },
  passwordInput: { color: '#1F1F1F', flex: 1, padding: 14, fontSize: 15 },
  eyeButton: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },
  hint: { fontSize: 11, color: '#888', marginTop: 4 },
  error: { color: '#e74c3c', textAlign: 'center', marginTop: 16, fontSize: 13 },
  success: { color: '#27ae60', textAlign: 'center', marginTop: 16, fontSize: 14, fontWeight: '600' },
  button: { backgroundColor: PRIMARY, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  back: { alignItems: 'center', marginTop: 16 },
  backText: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
});