// src/screens/DevelopersScreen.js
// BAGONG SCREEN: "Developers' Profiles" module - required na module
// para sa project (nagpapakita ng team members, roles, at basic info)

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// EDIT DITO: palitan ng totoong impormasyon ng bawat miyembro ng grupo
const DEVELOPERS = [
  { name: 'Al-Jaifer Ali', role: 'Project Manager / Lead Developer', course: 'BSIT' },
  { name: 'Allan Claronino', role: 'Backend Developer', course: 'BSIT' },
  { name: 'Clark Derick Custodio', role: 'Frontend Developer', course: 'BSIT' },
  { name: 'James Cyrus Diaz', role: 'UI/UX Designer', course: 'BSIT' },
  { name: 'Khallel John Kiunisala', role: 'QA Tester', course: 'BSIT' },
  { name: 'Karl Vincent Remolano', role: 'Documentation Specialist', course: 'BSIT' },
];

export default function DevelopersScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Meet the Developers</Text>
      <Text style={styles.subtitle}>The people who built Fitora Gear</Text>

      {DEVELOPERS.map((dev) => (
        <View key={dev.name} style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{dev.name.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{dev.name}</Text>
            <Text style={styles.role}>{dev.role}</Text>
            <Text style={styles.course}>{dev.course}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111111', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 24, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111111' },
  role: { fontSize: 13, color: PRIMARY, marginTop: 2 },
  course: { fontSize: 12, color: '#888', marginTop: 2 },
});