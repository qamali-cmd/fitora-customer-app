// src/components/PickerModal.js
// A full-screen list with a search box. Used to choose a region, province, city or barangay.

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, ActivityIndicator, StyleSheet } from 'react-native';

export default function PickerModal({ visible, title, items, loading, error, onSelect, onClose, onRetry, onManual }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const text = query.trim().toLowerCase();
  const shown = text ? items.filter((item) => item.name.toLowerCase().includes(text)) : items;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {!loading && !error ? (
          <TextInput
            style={styles.search}
            placeholder="Search..."
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#fc408c" />
            <Text style={styles.hint}>Loading the list...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={onRetry}>
              <Text style={styles.buttonText}>Try again</Text>
            </TouchableOpacity>
            {onManual ? (
              <TouchableOpacity onPress={onManual} style={styles.linkWrap}>
                <Text style={styles.link}>Type the location manually instead</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
                <Text style={styles.rowText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No results.</Text>}
          />
        )}
      </View>
    </Modal>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 54 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111111' },
  closeButton: { padding: 6 },
  close: { fontSize: 20, color: '#888' },
  search: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#f4f5f7', borderRadius: 8, padding: 12, fontSize: 15 },
  row: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowText: { fontSize: 15, color: '#111111' },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint: { color: '#888', marginTop: 12 },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: PRIMARY, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  linkWrap: { marginTop: 18 },
  link: { color: PRIMARY, fontSize: 14 },
});