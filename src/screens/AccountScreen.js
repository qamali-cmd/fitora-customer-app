// src/screens/AccountScreen.js
// The customer's profile: photo, verified email badge, stats, details, edit form, and shortcuts.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, TextInput,
  ActivityIndicator, ScrollView, Image,
} from 'react-native';
import Icon from '../components/Icon';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import BirthdayPicker from '../components/BirthdayPicker';

// EDIT HERE: Cloudinary settings used to upload the profile photo
const CLOUDINARY_CLOUD_NAME = 'roit6yup';
const CLOUDINARY_UPLOAD_PRESET = 'IMAGES';

function formatBirthday(text) {
  if (!text) return '—';
  const [y, m, d] = String(text).split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatMonthYear(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

async function uploadPhoto(asset) {
  const formData = new FormData();
  formData.append('file', { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || 'profile.jpg' });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!data.secure_url) throw new Error((data.error && data.error.message) || 'Could not upload the photo.');
  return data.secure_url;
}

export default function AccountScreen({ navigation }) {
  const { customer, logout, updateProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(customer?.firstName || '');
  const [middleName, setMiddleName] = useState(customer?.middleName || '');
  const [lastName, setLastName] = useState(customer?.lastName || '');
  const [username, setUsername] = useState(customer?.username || '');
  const [birthday, setBirthday] = useState(/^\d{4}-\d{2}-\d{2}$/.test(customer?.birthday || '') ? customer.birthday : '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Load the latest profile every time this tab is opened
  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => {});
    }, [])
  );

  // Keep the form fields in sync with the saved profile while not editing
  useEffect(() => {
    if (!editing) {
      setFirstName(customer?.firstName || '');
      setMiddleName(customer?.middleName || '');
      setLastName(customer?.lastName || '');
      setUsername(customer?.username || '');
      setBirthday(/^\d{4}-\d{2}-\d{2}$/.test(customer?.birthday || '') ? customer.birthday : '');
      setPhone(customer?.phone || '');
      setAddress(customer?.address || '');
    }
  }, [customer, editing]);

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  async function handleSave() {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      if (!firstName.trim() || !lastName.trim()) {
        setError('First name and last name are required.');
        return;
      }
      await updateProfile({
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        birthday: birthday || undefined,
      });
      setEditing(false);
      setNotice('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePickPhoto() {
    setError('');
    setNotice('');

    // The photo picker is loaded only when the button is pressed, so the rest of the app
    // keeps working even if this package has a problem on the phone.
    let ImagePicker;
    try {
      ImagePicker = require('expo-image-picker');
    } catch (err) {
      setError('The photo picker is not available on this phone right now.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;

      setUploading(true);
      const url = await uploadPhoto(result.assets[0]);
      await updateProfile({ profile_photo: url });
      setNotice('Profile photo updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const verified = customer?.emailVerified !== false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.profileCard}>
        <TouchableOpacity onPress={handlePickPhoto} disabled={uploading} style={styles.avatarWrap}>
          {customer?.profilePhoto ? (
            <Image source={{ uri: customer.profilePhoto }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{customer?.fullName?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="camera" size={16} color="#fff" />}
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{customer?.fullName}</Text>
        {customer?.username ? <Text style={styles.username}>@{customer.username}</Text> : null}
        <Text style={styles.email}>{customer?.email}</Text>
        <View style={[styles.badge, verified ? styles.badgeOk : styles.badgeWarn]}>
          <Text style={[styles.badgeText, verified ? styles.badgeTextOk : styles.badgeTextWarn]}>
            {verified ? '✓ Email verified' : '! Email not verified'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{customer?.orderCount ?? 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatMonthYear(customer?.createdAt)}</Text>
            <Text style={styles.statLabel}>Member since</Text>
          </View>
        </View>
      </View>

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        {!editing ? (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Personal details</Text>
              <TouchableOpacity onPress={() => { setNotice(''); setError(''); setEditing(true); }}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Username</Text>
            <Text style={styles.fieldValue}>{customer?.username ? '@' + customer.username : 'Not set yet (tap Edit to choose one)'}</Text>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>{customer?.phone || '—'}</Text>
            <Text style={styles.fieldLabel}>Address</Text>
            <Text style={styles.fieldValue}>{customer?.address || '—'}</Text>
            <Text style={styles.fieldLabel}>Birthday</Text>
            <Text style={styles.fieldValue}>{formatBirthday(customer?.birthday)}</Text>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Edit details</Text>
            <TextInput style={styles.input} placeholder="First name" value={firstName} onChangeText={setFirstName} />
            <TextInput style={styles.input} placeholder="Middle name (optional)" value={middleName} onChangeText={setMiddleName} />
            <TextInput style={styles.input} placeholder="Last name" value={lastName} onChangeText={setLastName} />
            <TextInput
              style={styles.input}
              placeholder="Username (4-20: letters, numbers, . _)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput style={styles.input} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
            <BirthdayPicker value={birthday} onChange={setBirthday} placeholder="Birthday (tap to choose)" />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('ChangePassword')}>
        <Text style={styles.menuText}>Change password</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuButton} onPress={() => navigation.navigate('Developers')}>
        <Text style={styles.menuText}>About the Developers</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111111', marginBottom: 16 },

  profileCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 14 },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#eee' },
  avatarText: { color: '#fff', fontSize: 38, fontWeight: 'bold' },
  cameraBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  cameraIcon: { fontSize: 14 },
  name: { fontSize: 20, fontWeight: '700', color: '#111111' },
  username: { fontSize: 14, color: PRIMARY, fontWeight: '600', marginTop: 2 },
  email: { fontSize: 14, color: '#888', marginTop: 2 },
  badge: { marginTop: 10, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 14 },
  badgeOk: { backgroundColor: '#eafaf0' },
  badgeWarn: { backgroundColor: '#fdf3e3' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextOk: { color: '#27ae60' },
  badgeTextWarn: { color: '#b9770e' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '700', color: '#111111' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#eee' },

  notice: { color: '#27ae60', textAlign: 'center', marginBottom: 10, fontSize: 13 },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 10, fontSize: 13 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111111' },
  editLink: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  fieldLabel: { fontSize: 12, color: '#888', marginTop: 12 },
  fieldValue: { fontSize: 15, color: '#111111', marginTop: 2 },
  input: {
    backgroundColor: '#f8f8fa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, marginTop: 10, fontSize: 14,
  },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  cancelButtonText: { color: '#555', fontSize: 14 },
  saveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: PRIMARY, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  menuButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  menuText: { color: '#111111', fontSize: 15, fontWeight: '600' },
  logoutButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e74c3c', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  logoutText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
});