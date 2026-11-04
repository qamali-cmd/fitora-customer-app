// src/screens/MessagesScreen.js
// The chat between the customer and the shop (the admin or the owner answers from the "Messages" page of the admin website).
// It looks for new answers every few seconds while it is open, and the replies that were read are marked as read.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../api/config';
import { request } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { useMessages } from '../context/MessageContext';
import { COLORS } from '../theme';
import Icon from '../components/Icon';
import { thumb } from '../utils/productUtils';

const POLL_MS = 8000;
const MAX = 1000;
const QUICK = ['Where is my order?', 'Is this product available?', 'I want to change my address', 'How do I pay with GCash?'];

export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// the messages with a "Today / Yesterday / date" line before the first message of each day
export function buildRows(messages, now = new Date()) {
  const rows = [];
  let last = null;
  for (const message of messages) {
    const label = dayLabel(message.created_at, now);
    if (label !== last) { rows.push({ type: 'day', key: `day-${message.message_id}`, label }); last = label; }
    rows.push({ type: 'message', key: `m-${message.message_id}`, message });
  }
  return rows;
}

// the first letters of a name (for the small circle when there is no photo)
export function initialOf(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return words.length ? words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() : '?';
}

// who wrote a message: the customer ("You"), or the person of the shop who answered (the name of the admin, or "Fitora Gear")
export function senderInfo(message, customer) {
  if (message.sender === 'customer') {
    return { mine: true, name: 'You', label: '', initial: initialOf(customer && customer.fullName), photo: (customer && customer.profilePhoto) || null };
  }
  const name = (message.admin_name && String(message.admin_name).trim()) || 'Fitora Gear';
  return { mine: false, name, label: 'Shop', initial: initialOf(name), photo: null };
}

// the small round picture next to a message: the logo for the shop, the photo or the letters of the customer
function Avatar({ uri, initial, logo }) {
  if (logo) return <Image source={require('../../assets/logo.png')} style={styles.avatarImage} />;
  if (uri) return <Image source={{ uri: thumb(uri, 100) }} style={styles.avatarImage} />;
  return <View style={styles.avatarInitial}><Text style={styles.avatarInitialText}>{initial}</Text></View>;
}

const timeText = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };

export default function MessagesScreen({ navigation }) {
  const insets = useSafeAreaInsets(); // ang taas ng navigation bar ng telepono (para hindi matakpan ang lugar ng pag-type)
  const { token, customer } = useAuth();
  const { refreshUnread } = useMessages();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async (quiet) => {
    try {
      const data = await request(`${API.ORDERS}/orders/messages/my`, { token });
      setMessages((old) => {
        const next = data.messages || [];
        // nothing new: the list is not changed (so the screen does not jump)
        return old.length === next.length && old.length > 0 && old[old.length - 1].message_id === next[next.length - 1].message_id ? old : next;
      });
      setStatus('ready');
      if ((data.unread || 0) > 0) request(`${API.ORDERS}/orders/messages/my/read`, { method: 'PUT', token }).then(() => refreshUnread()).catch(() => {});
    } catch (err) {
      if (!quiet) { setError(err.message); setStatus((old) => (old === 'ready' ? old : 'error')); }
    }
  }, [token, refreshUnread]);

  // when the chat is open, it looks for new answers every few seconds
  useFocusEffect(useCallback(() => {
    load(false);
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [load]));

  // the newest message is always in sight
  useEffect(() => {
    if (messages.length === 0) return undefined;
    const timer = setTimeout(() => { if (listRef.current && listRef.current.scrollToEnd) listRef.current.scrollToEnd({ animated: true }); }, 60);
    return () => clearTimeout(timer);
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const data = await request(`${API.ORDERS}/orders/messages/my`, { method: 'POST', token, body: { body } });
      setMessages((old) => [...old, data.message]);
      setText(''); // only a message that was sent is removed from the box
    } catch (err) {
      Alert.alert('Message not sent', err.message); // the text stays in the box, so nothing typed is lost
    } finally {
      setSending(false);
    }
  }

  const rows = buildRows(messages);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityLabel="Back"><Icon name="chevron-back" size={27} color="#fff" /></TouchableOpacity>
        <Image source={require('../../assets/logo.png')} style={styles.shopLogo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName}>Fitora Gear</Text>
          <Text style={styles.shopSub}>Chat with the shop</Text>
        </View>
      </View>

      {status === 'loading' ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={COLORS.primary} />
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Icon name="cloud-offline-outline" size={56} color={COLORS.primary} />
          <Text style={styles.centerTitle}>Could not open the chat</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setStatus('loading'); load(false); }}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => item.type === 'day' ? (
            <View style={styles.dayWrap}><Text style={styles.day}>{item.label}</Text></View>
          ) : (() => {
            const info = senderInfo(item.message, customer);
            return (
              <View style={[styles.bubbleRow, info.mine ? styles.rowMine : styles.rowShop]}>
                {!info.mine ? <Avatar logo /> : null}
                <View style={[styles.bubble, info.mine ? styles.bubbleMine : styles.bubbleShop]}>
                  <View style={styles.whoRow}>
                    <Text style={[styles.whoName, info.mine && styles.whoNameMine]} numberOfLines={1}>{info.name}</Text>
                    {info.label ? <View style={styles.shopTag}><Text style={styles.shopTagText}>{info.label}</Text></View> : null}
                  </View>
                  <Text style={[styles.bubbleText, info.mine && styles.bubbleTextMine]}>{item.message.body}</Text>
                  <Text style={[styles.time, info.mine && styles.timeMine]}>{timeText(item.message.created_at)}</Text>
                </View>
                {info.mine ? <Avatar uri={info.photo} initial={info.initial} /> : null}
              </View>
            );
          })()}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyCircle}><Icon name="chatbubble-ellipses-outline" size={44} color={COLORS.primary} /></View>
              <Text style={styles.centerTitle}>Say hello!</Text>
              <Text style={styles.centerText}>Ask about products, your orders, or delivery. The shop will answer you here.</Text>
              <View style={styles.quickWrap}>
                {QUICK.map((q) => (
                  <TouchableOpacity key={q} style={styles.quick} onPress={() => setText(q)} accessibilityLabel={`Use: ${q}`}><Text style={styles.quickText}>{q}</Text></TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(Platform.OS === 'ios' ? 22 : 8, insets.bottom + 8) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.muted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={MAX}
          editable={status !== 'loading'}
        />
        <TouchableOpacity style={[styles.sendButton, (!text.trim() || sending) && styles.sendOff]} onPress={send} disabled={!text.trim() || sending} accessibilityLabel="Send">
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
      {text.length > MAX - 100 ? <Text style={styles.counter}>{text.length}/{MAX}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : Platform.OS === 'ios' ? 50 : 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingTop: TOP, paddingBottom: 12, paddingHorizontal: 8 },
  back: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  shopLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', marginHorizontal: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  shopName: { fontSize: 17, fontWeight: '800', color: '#fff', marginLeft: 6 },
  shopSub: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginLeft: 6 },
  list: { padding: 12, paddingBottom: 16, flexGrow: 1 },
  dayWrap: { alignItems: 'center', marginVertical: 10 },
  day: { fontSize: 11, fontWeight: '700', color: COLORS.muted, backgroundColor: '#ebe7ea', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 3, overflow: 'hidden' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 },
  rowMine: { justifyContent: 'flex-end' },
  rowShop: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '76%', flexShrink: 1, borderRadius: 18, paddingHorizontal: 13, paddingTop: 9, paddingBottom: 6 },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 5 },
  bubbleShop: { backgroundColor: '#fff', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#efe4ea' },
  bubbleText: { fontSize: 15, lineHeight: 21, color: COLORS.text },
  bubbleTextMine: { color: '#fff' },
  avatarImage: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', marginHorizontal: 6, borderWidth: 1, borderColor: '#efe4ea' },
  avatarInitial: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  avatarInitialText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  whoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  whoName: { fontSize: 12, fontWeight: '800', color: COLORS.ink, flexShrink: 1 },
  whoNameMine: { color: '#fff' },
  shopTag: { marginLeft: 6, backgroundColor: COLORS.primarySoft, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  shopTagText: { fontSize: 9, fontWeight: '800', color: COLORS.primaryDark, textTransform: 'uppercase' },
  time: { fontSize: 10, color: COLORS.muted, marginTop: 3, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.8)' },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: 36, paddingVertical: 56 },
  centerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink, marginTop: 14 },
  centerText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  retry: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 22, paddingHorizontal: 26, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '800' },
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 18 },
  quick: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffc2dc', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 8, margin: 4 },
  quickText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.line, paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 22 : 8 },
  input: { flex: 1, maxHeight: 110, minHeight: 40, backgroundColor: COLORS.bg, borderRadius: 20, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: COLORS.ink },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendOff: { backgroundColor: '#e3a9c1' },
  counter: { position: 'absolute', right: 66, bottom: 56, fontSize: 11, color: COLORS.muted },
});