// src/screens/AddressFormScreen.js
// Add or edit a delivery address: contact, region > province > city > barangay, street, ZIP code, landmark.

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import API from '../api/config';
import { request } from '../api/http';
import { getRegions, getProvinceOptions, getCityOptions, getBarangays, INDEPENDENT } from '../api/psgc';
import { useAuth } from '../context/AuthContext';
import PickerModal from '../components/PickerModal';

function fromSaved(code, name) {
  return name ? { code: code || null, name } : null;
}

function SelectField({ label, value, placeholder, onPress, disabled }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.select, disabled && styles.selectDisabled]} onPress={onPress} activeOpacity={0.7}>
        <Text style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AddressFormScreen({ navigation, route }) {
  const { customer, token } = useAuth();
  const editing = (route && route.params && route.params.address) || null;

  const [recipient, setRecipient] = useState(editing ? editing.recipient_name : customer?.fullName || '');
  const [phone, setPhone] = useState(editing ? editing.phone : customer?.phone || '');
  const [region, setRegion] = useState(editing ? fromSaved(editing.region_code, editing.region_name) : null);
  const [province, setProvince] = useState(editing ? fromSaved(editing.province_code, editing.province_name) : null);
  const [city, setCity] = useState(editing ? fromSaved(editing.city_code, editing.city_name) : null);
  const [barangay, setBarangay] = useState(editing ? fromSaved(editing.barangay_code, editing.barangay_name) : null);
  const [street, setStreet] = useState(editing ? editing.street : '');
  const [zip, setZip] = useState(editing ? editing.zip_code : '');
  const [landmark, setLandmark] = useState(editing ? editing.landmark || '' : '');
  const [label, setLabel] = useState(editing ? editing.label : 'home');
  const [isDefault, setIsDefault] = useState(editing ? !!editing.is_default : false);

  const [manual, setManual] = useState(false); // type the location names by hand
  const [picker, setPicker] = useState(null); // { kind, items, loading, error }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function showPicker(kind, ctx = {}) {
    const r = ctx.region || region;
    const p = ctx.province || province;
    const c = ctx.city || city;
    setPicker({ kind, items: [], loading: true, error: '' });
    try {
      let items;
      if (kind === 'region') {
        items = await getRegions();
      } else if (kind === 'province') {
        items = await getProvinceOptions(r.code);
        if (items.length === 0) {
          // Metro Manila has no provinces, so go straight to the city list
          const metro = { code: r.code, name: 'Metro Manila' };
          setProvince(metro);
          setCity(null);
          setBarangay(null);
          return showPicker('city', { region: r, province: metro });
        }
      } else if (kind === 'city') {
        items = await getCityOptions(r.code, p);
      } else {
        items = await getBarangays(c.code);
      }
      setPicker({ kind, items, loading: false, error: '' });
    } catch (err) {
      setPicker({ kind, items: [], loading: false, error: err.message });
    }
  }

  function openPicker(kind) {
    setError('');
    if (kind === 'province' && !region) return setError('Please choose the region first.');
    if (kind === 'city' && !province) return setError('Please choose the province first.');
    if (kind === 'barangay' && !city) return setError('Please choose the city or municipality first.');
    // A saved address typed by hand has no list code, so the customer must choose the parent again from the list
    if (kind === 'province' && !region.code) return setError('Please choose the region again from the list.');
    if (kind === 'city' && !province.code && province.name !== INDEPENDENT.name) return setError('Please choose the province again from the list.');
    if (kind === 'barangay' && !city.code) return setError('Please choose the city again from the list.');
    showPicker(kind);
  }

  function handleSelect(item) {
    const kind = picker.kind;
    setPicker(null);
    if (kind === 'region') { setRegion(item); setProvince(null); setCity(null); setBarangay(null); }
    else if (kind === 'province') { setProvince(item); setCity(null); setBarangay(null); }
    else if (kind === 'city') { setCity(item); setBarangay(null); }
    else setBarangay(item);
  }

  async function handleSave() {
    setError('');
    if (recipient.trim().length < 2) return setError('Please enter the recipient name.');
    if (!/^\+?\d{7,15}$/.test(phone.replace(/[\s()-]/g, ''))) return setError('Please enter a valid phone number (7-15 digits).');
    if (!region || !region.name.trim()) return setError('Please choose or enter the region.');
    if (!province || !province.name.trim()) return setError('Please choose or enter the province.');
    if (!city || !city.name.trim()) return setError('Please choose or enter the city or municipality.');
    if (!barangay || !barangay.name.trim()) return setError('Please choose or enter the barangay.');
    if (street.trim().length < 3) return setError('Please enter the house number, street, or building.');
    if (!/^\d{4}$/.test(zip)) return setError('The ZIP code must be exactly 4 digits.');

    const independent = province.code === INDEPENDENT.code;
    setSaving(true);
    try {
      await request(`${API.AUTH}/customers/me/addresses${editing ? `/${editing.address_id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        token,
        body: {
          recipient_name: recipient.trim(),
          phone: phone.trim(),
          region_code: region.code, region_name: region.name.trim(),
          province_code: independent ? null : province.code, province_name: independent ? 'Independent city' : province.name.trim(),
          city_code: city.code, city_name: city.name.trim(),
          barangay_code: barangay.code, barangay_name: barangay.name.trim(),
          street: street.trim(),
          zip_code: zip,
          landmark: landmark.trim(),
          label,
          is_default: isDefault,
        },
      });
      navigation.goBack();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const titles = { region: 'Choose a region', province: 'Choose a province', city: 'Choose a city or municipality', barangay: 'Choose a barangay' };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Contact</Text>
        <Text style={styles.label}>Recipient name</Text>
        <TextInput style={styles.input} value={recipient} onChangeText={setRecipient} placeholder="Full name of the person who will receive the order" />
        <Text style={styles.label}>Phone number</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="09XX XXX XXXX" keyboardType="phone-pad" />

        <Text style={styles.section}>Address</Text>
        {manual ? (
          <View>
            <Text style={styles.notice}>Type your location exactly as it appears on your address.</Text>
            <Text style={styles.label}>Region</Text>
            <TextInput style={styles.input} value={region ? region.name : ''} onChangeText={(t) => setRegion({ code: null, name: t })} placeholder="e.g. CALABARZON" />
            <Text style={styles.label}>Province</Text>
            <TextInput style={styles.input} value={province ? province.name : ''} onChangeText={(t) => setProvince({ code: null, name: t })} placeholder="e.g. Quezon" />
            <Text style={styles.label}>City or municipality</Text>
            <TextInput style={styles.input} value={city ? city.name : ''} onChangeText={(t) => setCity({ code: null, name: t })} placeholder="e.g. Lucena City" />
            <Text style={styles.label}>Barangay</Text>
            <TextInput style={styles.input} value={barangay ? barangay.name : ''} onChangeText={(t) => setBarangay({ code: null, name: t })} placeholder="e.g. Ilayang Dupay" />
            <TouchableOpacity onPress={() => { setManual(false); setRegion(null); setProvince(null); setCity(null); setBarangay(null); }}>
              <Text style={styles.link}>Choose from the list instead</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <SelectField label="Region" value={region && region.name} placeholder="Choose a region" onPress={() => showPicker('region')} />
            <SelectField label="Province" value={province && province.name} placeholder="Choose a province" disabled={!region} onPress={() => openPicker('province')} />
            <SelectField label="City or municipality" value={city && city.name} placeholder="Choose a city or municipality" disabled={!province} onPress={() => openPicker('city')} />
            <SelectField label="Barangay" value={barangay && barangay.name} placeholder="Choose a barangay" disabled={!city} onPress={() => openPicker('barangay')} />
            <TouchableOpacity onPress={() => setManual(true)}>
              <Text style={styles.link}>Cannot find your location? Type it manually</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>House number, street, or building</Text>
        <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder="e.g. 12 Rizal Street, Unit 3B" />
        <Text style={styles.label}>ZIP code</Text>
        <TextInput style={styles.input} value={zip} onChangeText={(t) => setZip(t.replace(/\D/g, '').slice(0, 4))} placeholder="4 digits" keyboardType="number-pad" maxLength={4} />
        <Text style={styles.label}>Landmark (optional)</Text>
        <TextInput style={styles.input} value={landmark} onChangeText={setLandmark} placeholder="e.g. Beside the church, blue gate" />

        <Text style={styles.section}>Label as</Text>
        <View style={styles.chips}>
          {[['home', 'Home'], ['office', 'Office']].map(([key, text]) => (
            <TouchableOpacity key={key} style={[styles.chip, label === key && styles.chipActive]} onPress={() => setLabel(key)}>
              <Text style={[styles.chipText, label === key && styles.chipTextActive]}>{text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Set as my default address</Text>
          <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: '#b8b0f0', false: '#ddd' }} thumbColor={isDefault ? '#6C5CE7' : '#f4f3f4'} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Save changes' : 'Save address'}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <PickerModal
        visible={!!picker}
        title={picker ? titles[picker.kind] : ''}
        items={picker ? picker.items : []}
        loading={picker ? picker.loading : false}
        error={picker ? picker.error : ''}
        onSelect={handleSelect}
        onClose={() => setPicker(null)}
        onRetry={() => picker && showPicker(picker.kind)}
        onManual={() => { setPicker(null); setManual(true); }}
      />
    </View>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 18, paddingBottom: 50 },
  section: { fontSize: 15, fontWeight: '700', color: '#2B2140', marginTop: 18, marginBottom: 4 },
  label: { fontSize: 12, color: '#666', marginTop: 12, marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 13 },
  selectDisabled: { opacity: 0.5 },
  selectText: { flex: 1, fontSize: 15, color: '#2B2140' },
  placeholder: { color: '#aaa' },
  chevron: { fontSize: 22, color: '#bbb', marginLeft: 8 },
  link: { color: PRIMARY, fontSize: 13, marginTop: 14 },
  notice: { color: '#666', fontSize: 13, marginTop: 6 },
  chips: { flexDirection: 'row', gap: 10, marginTop: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { color: '#555', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  switchLabel: { fontSize: 15, color: '#2B2140' },
  error: { color: '#e74c3c', textAlign: 'center', marginTop: 16, fontSize: 13 },
  saveButton: { backgroundColor: PRIMARY, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 22 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});