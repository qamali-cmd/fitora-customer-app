// src/screens/LegalScreen.js
// The terms of use and the privacy policy of the shop, in simple words.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../theme';
import Icon from '../components/Icon';

export const TERMS = [
  ['Your account', 'Keep your password to yourself, and give true information. The shop may suspend an account that is used for abuse or fraud.'],
  ['Orders and prices', 'An order is confirmed when the shop accepts it. The prices and the stock shown in the app can change. If an item is no longer available, the shop may cancel the order and give back what you paid.'],
  ['Payment', 'You can pay with Cash on Delivery or GCash. A GCash payment is made on a secure page of the payment provider, and the app does not keep your payment details.'],
  ['Cancellations and refunds', 'You can cancel an order that is still pending. For an order that is being prepared, you can send a request, and the shop will answer you. A GCash payment of a cancelled order is refunded by the shop.'],
  ['Reviews and messages', 'Please be respectful. The shop may hide a review that is not appropriate.'],
];

export const PRIVACY = [
  ['What we keep', 'Your name, username, email, phone number, birthday, delivery addresses, profile photo, orders, reviews, and the messages that you send to the shop.'],
  ['Why we keep it', 'To process and deliver your orders, to send you emails about your account and your orders, to answer your messages, and to make the shop better.'],
  ['Who can see it', 'The people who work for the shop can see your details to prepare and deliver your orders. The courier gets your name, phone number, and address. The payment provider gets your payment details on its own page. We do not sell your information.'],
  ['Your choices', 'You can change your details in Edit Profile. To delete your account, send a message to the shop, and your personal details will be erased.'],
];

function Section({ title, items }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {items.map(([heading, body]) => (
        <View key={heading} style={styles.block}>
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
      ))}
    </View>
  );
}

export default function LegalScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Icon name="document-text-outline" size={28} color={COLORS.primary} /></View>
        <Text style={styles.heroTitle}>Terms and Privacy</Text>
        <Text style={styles.heroText}>Fitora Gear is an online shop for accessories. By using the app, you agree to these terms.</Text>
      </View>
      <Section title="Terms of Use" items={TERMS} />
      <Section title="Privacy Policy" items={PRIVACY} />
      <Text style={styles.updated}>Last updated: October 2026</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 30 },
  hero: { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 22, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f1e4ea' },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 19, fontWeight: '800', color: COLORS.ink, marginTop: 12 },
  heroText: { fontSize: 13, color: COLORS.muted, marginTop: 4, textAlign: 'center', lineHeight: 19 },
  card: { backgroundColor: '#fff', marginTop: 12, padding: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1e4ea' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },
  block: { marginTop: 12 },
  heading: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  body: { fontSize: 14, color: '#555', lineHeight: 21, marginTop: 3 },
  updated: { textAlign: 'center', color: COLORS.muted, fontSize: 12, marginTop: 16 },
});