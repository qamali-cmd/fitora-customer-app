// src/screens/HelpCentreScreen.js
// Questions and answers about the shop. Press a question to open its answer.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { COLORS, peso } from '../theme';
import Icon from '../components/Icon';

// EDIT DITO: the numbers of the shipping discount must be the same as in the order service (FREE_SHIPPING_MIN and FREE_SHIPPING_MAX_DISCOUNT)
export const FAQ = [
  { q: 'How do I place an order?', a: 'Open a product and press Add to Cart. Then open your cart and press Checkout. Choose your delivery address and how you want to pay, and place your order.' },
  { q: 'How can I pay?', a: 'You can pay with Cash on Delivery or with GCash. With GCash, you are taken to a secure GCash page, and you come back to the app after you pay.' },
  { q: 'My GCash payment is not confirmed yet. What should I do?', a: 'Open My Purchases and look at the To Pay tab. Press Pay Now to open the payment page again, or open the order to check the payment. A GCash order that is not paid within 30 minutes is cancelled automatically.' },
  { q: 'How much is the shipping fee?', a: `The fee depends on your delivery address and on the weight of your order. If your order is ${peso(1500)} or more, you get up to ${peso(100)} off the shipping fee.` },
  { q: 'How do I track my order?', a: 'Open My Purchases. When your order is shipped, you will see the courier and the tracking number on the order and in your Notifications. Press Order Received when your parcel arrives.' },
  { q: 'Can I cancel my order?', a: 'You can cancel an order that is still pending. If the shop is already preparing it, send a cancellation request from the page of the order, and the shop will answer you. If you paid with GCash, the shop will refund your payment.' },
  { q: 'How do I rate a product?', a: 'When your order is completed, open it and press Rate next to the item. You can give 1 to 5 stars, write a comment, and add up to 5 photos and 1 short video.' },
  { q: 'I forgot my password.', a: 'On the login page, press Forgot password?, type your email or username, and use the code that we send to your email to choose a new password.' },
  { q: 'How do I change my delivery address?', a: 'Go to Me, then My addresses. You can save up to 10 addresses and choose one as your default.' },
  { q: 'How do I delete my account?', a: 'Send us a message and the shop will delete your account. Your personal details are erased, and your past orders are kept only for the records of the shop.' },
];

export default function HelpCentreScreen({ navigation }) {
  const [open, setOpen] = useState(0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Icon name="help-circle-outline" size={30} color={COLORS.primary} /></View>
        <Text style={styles.heroTitle}>How can we help you?</Text>
        <Text style={styles.heroText}>Find the answer to a question here, or message the shop.</Text>
      </View>

      <View style={styles.group}>
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <View key={item.q} style={[styles.item, i < FAQ.length - 1 && styles.itemLine]}>
              <TouchableOpacity style={styles.question} onPress={() => setOpen(isOpen ? -1 : i)} accessibilityLabel={item.q}>
                <Text style={styles.questionText}>{item.q}</Text>
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.primary} />
              </TouchableOpacity>
              {isOpen ? <Text style={styles.answer}>{item.a}</Text> : null}
            </View>
          );
        })}
      </View>

      <View style={styles.contact}>
        <Text style={styles.contactTitle}>Still need help?</Text>
        <Text style={styles.contactText}>Send a message to the shop. We will answer you in the chat.</Text>
        <TouchableOpacity style={styles.contactButton} onPress={() => navigation.navigate('Messages')} accessibilityLabel="Message the shop">
          <Icon name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.contactButtonText}>Message the shop</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 30 },
  hero: { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 22, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1e4ea' },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 19, fontWeight: '800', color: COLORS.ink, marginTop: 12 },
  heroText: { fontSize: 13, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
  group: { backgroundColor: '#fff', marginTop: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1e4ea' },
  item: { paddingHorizontal: 16 },
  itemLine: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  question: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15 },
  questionText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.ink, paddingRight: 12 },
  answer: { fontSize: 14, color: '#555', lineHeight: 21, paddingBottom: 16 },
  contact: { alignItems: 'center', backgroundColor: '#fff', marginTop: 12, padding: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1e4ea' },
  contactTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  contactText: { fontSize: 13, color: COLORS.muted, marginTop: 4, textAlign: 'center' },
  contactButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 24, paddingHorizontal: 22, height: 46, marginTop: 14 },
  contactButtonText: { color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 8 },
});   