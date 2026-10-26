// src/screens/EditProfileScreen.js
// EDIT PROFILE (like a big shopping app): the photo on top, and a row for each detail (Name, Username, Birthday, Phone).
// Press a row to change it. The email can be seen here, but it cannot be changed. (The settings of the account are another page.)
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';
import Icon from '../components/Icon';
import BirthdayPicker from '../components/BirthdayPicker';

// EDIT HERE: Cloudinary settings used to upload the profile photo
const CLOUDINARY_CLOUD_NAME = 'roit6yup';
const CLOUDINARY_UPLOAD_PRESET = 'IMAGES';

function formatBirthday(text) {
  const [y, m, d] = String(text || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatMonthYear(iso) {
  const date = new Date(iso);
  return iso && !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
}

async function uploadPhoto(asset) {
  const formData = new FormData();
  formData.append('file', { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || 'profile.jpg' });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
  const data = await response.json();
  if (!data.secure_url) throw new Error((data.error && data.error.message) || 'Could not upload the photo.');
  return data.secure_url;
}

function Row({ label, value, placeholder, onPress, last, valueNode }) {
  const inner = (
    <>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {valueNode || <Text style={[styles.rowValue, !value && styles.rowPlaceholder]} numberOfLines={1}>{value || placeholder}</Text>}
        {onPress ? <Icon name="chevron-forward" size={16} color={COLORS.muted} /> : null}
      </View>
    </>
  );
  return onPress
    ? <TouchableOpacity style={[styles.row, !last && styles.rowLine]} onPress={onPress} accessibilityLabel={label}>{inner}</TouchableOpacity>
    : <View style={[styles.row, !last && styles.rowLine]}>{inner}</View>;
}

export default function EditProfileScreen() {
  const { customer, updateProfile, refreshProfile } = useAuth();
  const [sheet, setSheet] = useState(null); // null | 'name' | 'username' | 'phone'
  const [first, setFirst] = useState('');
  const [middle, setMiddle] = useState('');
  const [last, setLast] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sheetError, setSheetError] = useState('');

  useFocusEffect(useCallback(() => { refreshProfile().catch(() => {}); }, []));

  function openSheet(kind) {
    setSheetError('');
    setFirst(customer?.firstName || '');
    setMiddle(customer?.middleName || '');
    setLast(customer?.lastName || '');
    setUsername(customer?.username || '');
    setPhone(customer?.phone || '');
    setSheet(kind);
  }

  async function save() {
    setSheetError('');
    let payload;
    if (sheet === 'name') {
      if (!first.trim() || !last.trim()) { setSheetError('First name and last name are required.'); return; }
      payload = { first_name: first.trim(), middle_name: middle.trim(), last_name: last.trim() };
    } else if (sheet === 'username') {
      if (!username.trim()) { setSheetError('Please type a username.'); return; }
      payload = { username: username.trim().toLowerCase() };
    } else {
      payload = { phone: phone.trim() };
    }
    setSaving(true);
    try {
      await updateProfile(payload);
      setSheet(null);
      setError('');
      setNotice('Your profile was updated.');
    } catch (err) {
      setSheetError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveBirthday(value) {
    setNotice(''); setError('');
    try {
      await updateProfile({ birthday: value });
      setNotice('Your profile was updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function pickPhoto() {
    setNotice(''); setError('');
    // the photo picker is loaded only now, so the rest of the app keeps working even if it has a problem
    let ImagePicker;
    try {
      ImagePicker = require('expo-image-picker');
    } catch (err) {
      setError('The photo picker is not available right now.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (result.canceled) return;
      setUploading(true);
      const url = await uploadPhoto(result.assets[0]);
      await updateProfile({ profile_photo: url });
      setNotice('Your photo was updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const verified = customer?.emailVerified !== false;
  const birthday = /^\d{4}-\d{2}-\d{2}$/.test(customer?.birthday || '') ? customer.birthday : '';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {notice ? <View style={styles.noticeBox}><Icon name="checkmark-circle" size={17} color="#1E8E4F" /><Text style={styles.noticeText}>{notice}</Text></View> : null}
        {error ? <View style={styles.errorBox}><Icon name="alert-circle-outline" size={17} color={COLORS.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.photoCard}>
          <TouchableOpacity onPress={pickPhoto} disabled={uploading} activeOpacity={0.85} accessibilityLabel="Change the photo">
            {customer?.profilePhoto ? (
              <Image source={{ uri: customer.profilePhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{customer?.fullName?.charAt(0)?.toUpperCase() || '?'}</Text></View>
            )}
            <View style={styles.cameraBadge}>{uploading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="camera" size={15} color="#fff" />}</View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editPhoto} onPress={pickPhoto} disabled={uploading}>
            <Icon name="create-outline" size={17} color={COLORS.primary} /><Text style={styles.editPhotoText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.group}>
          <Row label="Name" value={customer?.fullName} placeholder="Set now" onPress={() => openSheet('name')} />
          <Row label="Username" value={customer?.username ? `@${customer.username}` : ''} placeholder="Set now" onPress={() => openSheet('username')} last />
        </View>

        <View style={styles.group}>
          <BirthdayPicker
            value={birthday}
            onChange={saveBirthday}
            renderField={({ open, text }) => <Row label="Birthday" value={text} placeholder="Set now" onPress={open} />}
          />
          <Row label="Phone" value={customer?.phone} placeholder="Set now" onPress={() => openSheet('phone')} last />
        </View>

        <View style={styles.group}>
          <Row
            label="Email"
            valueNode={
              <View style={styles.emailValue}>
                <Text style={styles.rowValue} numberOfLines={1}>{customer?.email}</Text>
                <View style={[styles.verifyTag, verified ? styles.verifyOk : styles.verifyWarn]}>
                  <Text style={[styles.verifyText, verified ? styles.verifyTextOk : styles.verifyTextWarn]}>{verified ? 'Verified' : 'Not verified'}</Text>
                </View>
              </View>
            }
          />
          <Row label="Member since" value={formatMonthYear(customer?.createdAt)} placeholder="-" />
          <Row label="Orders" value={String(customer?.orderCount ?? 0)} last />
        </View>
      </ScrollView>

      <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.overlayTop} activeOpacity={1} onPress={() => setSheet(null)} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{sheet === 'name' ? 'Name' : sheet === 'username' ? 'Username' : 'Phone'}</Text>
            {sheet === 'name' ? (
              <View>
                <TextInput style={styles.input} placeholder="First name" value={first} onChangeText={setFirst} autoCapitalize="words" />
                <TextInput style={styles.input} placeholder="Middle name (optional)" value={middle} onChangeText={setMiddle} autoCapitalize="words" />
                <TextInput style={styles.input} placeholder="Last name" value={last} onChangeText={setLast} autoCapitalize="words" />
              </View>
            ) : null}
            {sheet === 'username' ? (
              <View>
                <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
                <Text style={styles.hint}>4 to 20 letters, numbers, dots or underscores.</Text>
              </View>
            ) : null}
            {sheet === 'phone' ? (
              <View>
                <TextInput style={styles.input} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Text style={styles.hint}>Leave it empty to remove your phone number.</Text>
              </View>
            ) : null}
            {sheetError ? <Text style={styles.sheetError}>{sheetError}</Text> : null}
            <View style={styles.sheetButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setSheet(null)} accessibilityLabel="Cancel"><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving} accessibilityLabel="Save">
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 12, paddingBottom: 30 },
  noticeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F7EA', borderRadius: 12, padding: 12, marginBottom: 10 },
  noticeText: { color: '#1E8E4F', fontWeight: '700', fontSize: 13, marginLeft: 8, flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDE9E7', borderRadius: 12, padding: 12, marginBottom: 10 },
  errorText: { color: COLORS.danger, fontWeight: '700', fontSize: 13, marginLeft: 8, flex: 1 },
  photoCard: { backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', paddingVertical: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f1e4ea' },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffc2dc' },
  avatarImage: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#eee', borderWidth: 2, borderColor: '#ffc2dc' },
  avatarText: { color: COLORS.primary, fontSize: 38, fontWeight: '800' },
  cameraBadge: { position: 'absolute', right: -2, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  editPhoto: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  editPhotoText: { color: COLORS.primary, fontWeight: '800', fontSize: 14, marginLeft: 5 },
  group: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#f1e4ea' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  rowLabel: { fontSize: 15, color: COLORS.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 16 },
  rowValue: { fontSize: 15, color: COLORS.ink, textAlign: 'right', flexShrink: 1, marginRight: 4 },
  rowPlaceholder: { color: '#b5b5bb' },
  emailValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  verifyTag: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 },
  verifyOk: { backgroundColor: '#E3F7EA' },
  verifyWarn: { backgroundColor: '#FFF3D6' },
  verifyText: { fontSize: 11, fontWeight: '800' },
  verifyTextOk: { color: '#1E8E4F' },
  verifyTextWarn: { color: '#B9770E' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  overlayTop: { flex: 1 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 26 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e6dce3', borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 15, color: COLORS.ink, backgroundColor: COLORS.bg, marginBottom: 10 },
  hint: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  sheetError: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginTop: 4 },
  sheetButtons: { flexDirection: 'row', marginTop: 14 },
  cancelButton: { flex: 1, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cancelText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  saveButton: { flex: 1, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});