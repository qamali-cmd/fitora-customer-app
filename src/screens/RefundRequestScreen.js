// src/screens/RefundRequestScreen.js
// After the customer received an order, here they can ask for a refund of the items with a problem:
// choose the items, the reason, write what happened, and add 1 to 3 photos as proof.
// When a request was already sent, this screen shows its state (requested, approved, refunded, or declined).
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, StyleSheet, Platform, StatusBar, KeyboardAvoidingView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../api/config';
import { request } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { COLORS, TONES, peso } from '../theme';
import Icon from '../components/Icon';
import ImageViewer from '../components/ImageViewer';
import { thumb } from '../utils/productUtils';
import { pickMedia, uploadReviewMedia } from '../utils/mediaUpload';
import { REFUND_REASONS, MAX_REFUND_PHOTOS, MAX_DETAILS, refundDeadline, daysLeftText, refundTotal, selectedLines, validateRefund, refundStatusInfo } from '../utils/refundUtils';

const dateText = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

function ItemPhoto({ uri, style }) {
  return uri
    ? <Image source={{ uri: thumb(uri, 200) }} style={style} resizeMode="cover" />
    : <View style={[style, styles.photoEmpty]}><Icon name="image-outline" size={22} color={COLORS.primary} style={{ opacity: 0.5 }} /></View>;
}

export default function RefundRequestScreen({ navigation, route }) {
  const { orderId } = route.params;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [selection, setSelection] = useState({}); // { order_item_id: how many }
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [photos, setPhotos] = useState([]);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState('');
  const [formError, setFormError] = useState('');
  const [viewer, setViewer] = useState({ open: false, list: [], start: 0 });

  const load = useCallback(async () => {
    try {
      const data = await request(`${API.ORDERS}/orders/my/${orderId}`, { token });
      setOrder(data);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus((old) => (old === 'ready' ? old : 'error'));
    }
  }, [orderId, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const items = order ? order.items || [] : [];
  const lines = selectedLines(items, selection);
  const total = refundTotal(items, selection);

  function toggleItem(item) {
    setFormError('');
    setSelection((current) => {
      const next = { ...current };
      if (next[item.order_item_id]) delete next[item.order_item_id];
      else next[item.order_item_id] = Number(item.quantity); // by default, all the pieces of the item
      return next;
    });
  }

  function changeQuantity(item, step) {
    setSelection((current) => {
      const quantity = (current[item.order_item_id] || 1) + step;
      if (quantity < 1 || quantity > Number(item.quantity)) return current;
      return { ...current, [item.order_item_id]: quantity };
    });
  }

  async function addPhotos() {
    setFormError('');
    const room = MAX_REFUND_PHOTOS - photos.length;
    if (room <= 0) { setFormError(`You can add up to ${MAX_REFUND_PHOTOS} photos.`); return; }
    try {
      const picked = await pickMedia('photo', room);
      setPhotos((current) => [...current, ...picked].slice(0, MAX_REFUND_PHOTOS));
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function submit() {
    if (sending) return;
    const problem = validateRefund({ reason, details, photoCount: photos.length, lines });
    if (problem) { setFormError(problem); return; }
    setFormError('');
    setSending(true);
    try {
      const urls = [];
      for (let i = 0; i < photos.length; i++) {
        const label = `Uploading photo ${i + 1} of ${photos.length}`;
        setProgress(`${label}...`);
        const done = await uploadReviewMedia(photos[i], (percent) => setProgress(`${label}... ${percent}%`));
        urls.push(done.url);
      }
      setProgress('Sending your request...');
      await request(`${API.ORDERS}/orders/my/${orderId}/refund-request`, { method: 'POST', token, body: { reason, details: details.trim(), photos: urls, items: lines } });
      Alert.alert('Request sent', 'The shop will review your refund request. You will see the answer here and in your Notifications.');
      await load(); // now the screen shows the state of the request
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSending(false);
      setProgress('');
    }
  }

  const openPhotos = (list, start) => setViewer({ open: true, list, start });
  const request_ = order ? order.refund_request : null;

  let body;
  if (status === 'loading') {
    body = <ActivityIndicator style={{ marginTop: 60 }} size="large" color={COLORS.primary} />;
  } else if (status === 'error') {
    body = (
      <View style={styles.center}>
        <Icon name="cloud-offline-outline" size={56} color={COLORS.primary} />
        <Text style={styles.centerTitle}>Could not open this page</Text>
        <Text style={styles.centerText}>{error}</Text>
        <TouchableOpacity style={styles.mainButton} onPress={() => { setStatus('loading'); load(); }}><Text style={styles.mainButtonText}>Try again</Text></TouchableOpacity>
      </View>
    );
  } else if (request_) {
    // ---------- the request was already sent: its state ----------
    const info = refundStatusInfo(request_.status, order);
    const tone = TONES[info.tone] || TONES.pink;
    body = (
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 30 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={[styles.statusTag, { backgroundColor: tone.bg }]}>
            <Icon name={info.icon} size={16} color={tone.fg} />
            <Text style={[styles.statusTagText, { color: tone.fg }]}>{info.label}</Text>
          </View>
          <Text style={styles.hint}>{info.hint}</Text>
          {request_.status === 'rejected' && request_.admin_note ? (
            <View style={styles.noteBox}><Text style={styles.noteTitle}>Reason from the shop</Text><Text style={styles.noteText}>{request_.admin_note}</Text></View>
          ) : null}
          {request_.status === 'approved' && request_.admin_note ? (
            <View style={styles.noteBox}><Text style={styles.noteTitle}>Note from the shop</Text><Text style={styles.noteText}>{request_.admin_note}</Text></View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your request</Text>
          <View style={styles.line}><Text style={styles.lineLabel}>Refund amount</Text><Text style={styles.amount}>{peso(request_.refund_amount)}</Text></View>
          <View style={styles.line}><Text style={styles.lineLabel}>Reason</Text><Text style={styles.lineValue}>{request_.reason_label}</Text></View>
          <View style={styles.line}><Text style={styles.lineLabel}>Sent on</Text><Text style={styles.lineValue}>{dateText(request_.created_at)}</Text></View>
          <Text style={styles.detailsText}>{request_.details}</Text>
          {request_.photos && request_.photos.length > 0 ? (
            <View style={styles.photoRow}>
              {request_.photos.map((url, i) => (
                <TouchableOpacity key={url} onPress={() => openPhotos(request_.photos, i)} accessibilityLabel={`Open photo ${i + 1}`}>
                  <Image source={{ uri: thumb(url, 200) }} style={styles.proofPhoto} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items in this request</Text>
          {(request_.items || []).map((item) => (
            <View key={item.order_item_id} style={styles.itemRow}>
              <ItemPhoto uri={item.image} style={styles.itemPhoto} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.product_name || 'This product is no longer in the shop'}</Text>
                <Text style={styles.itemSub}>x{item.quantity}  ·  {peso(item.amount)}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Home', { screen: 'Messages' })} accessibilityLabel="Message the shop">
          <Icon name="chatbubble-ellipses-outline" size={18} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Message the shop</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  } else if (order && order.refund_eligible) {
    // ---------- the form ----------
    const left = daysLeftText(refundDeadline(order));
    body = (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 30 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.infoBox}>
            <Icon name="information-circle-outline" size={18} color={COLORS.primaryDark} />
            <Text style={styles.infoText}>Ask for a refund only for items with a problem. {left}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Which items have a problem?</Text>
            {items.map((item) => {
              const picked = !!selection[item.order_item_id];
              return (
                <View key={item.order_item_id} style={[styles.pickRow, picked && styles.pickRowOn]}>
                  <TouchableOpacity style={styles.pickMain} onPress={() => toggleItem(item)} accessibilityLabel={`Choose ${item.product_name}`}>
                    <Icon name={picked ? 'checkbox' : 'square-outline'} size={24} color={picked ? COLORS.primary : COLORS.muted} />
                    <ItemPhoto uri={item.image} style={styles.itemPhoto} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.product_name || 'This product is no longer in the shop'}</Text>
                      <Text style={styles.itemSub}>{peso(item.price)}  ·  you bought {item.quantity}</Text>
                    </View>
                  </TouchableOpacity>
                  {picked && Number(item.quantity) > 1 ? (
                    <View style={styles.stepper}>
                      <TouchableOpacity style={styles.stepButton} onPress={() => changeQuantity(item, -1)} accessibilityLabel="Fewer"><Icon name="remove" size={18} color={COLORS.primary} /></TouchableOpacity>
                      <Text style={styles.stepNumber}>{selection[item.order_item_id]}</Text>
                      <TouchableOpacity style={styles.stepButton} onPress={() => changeQuantity(item, 1)} accessibilityLabel="More"><Icon name="add" size={18} color={COLORS.primary} /></TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. What is the problem?</Text>
            <View style={styles.chips}>
              {REFUND_REASONS.map((r) => (
                <TouchableOpacity key={r.key} style={[styles.chip, reason === r.key && styles.chipOn]} onPress={() => { setReason(r.key); setFormError(''); }} accessibilityLabel={r.label}>
                  <Text style={[styles.chipText, reason === r.key && styles.chipTextOn]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Tell us what happened..."
              placeholderTextColor={COLORS.muted}
              value={details}
              onChangeText={(text) => { setDetails(text); setFormError(''); }}
              multiline
              maxLength={MAX_DETAILS}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{details.length}/{MAX_DETAILS}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Add photos of the problem</Text>
            <Text style={styles.cardHint}>1 to {MAX_REFUND_PHOTOS} photos. Clear photos help the shop answer faster.</Text>
            <View style={styles.photoRow}>
              {photos.map((p, i) => (
                <View key={p.uri} style={styles.proofWrap}>
                  <Image source={{ uri: p.uri }} style={styles.proofPhoto} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeButton} onPress={() => setPhotos((current) => current.filter((_, index) => index !== i))} accessibilityLabel={`Remove photo ${i + 1}`}>
                    <Icon name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < MAX_REFUND_PHOTOS ? (
                <TouchableOpacity style={styles.addPhoto} onPress={addPhotos} accessibilityLabel="Add photos">
                  <Icon name="camera-outline" size={26} color={COLORS.primary} />
                  <Text style={styles.addPhotoText}>Add</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Refund amount</Text>
            <Text style={styles.summaryValue}>{peso(total)}</Text>
          </View>
          <Text style={styles.summaryNote}>The shipping fee is not refunded.</Text>

          {formError ? <View style={styles.errorBox}><Icon name="alert-circle-outline" size={17} color={COLORS.danger} /><Text style={styles.errorText}>{formError}</Text></View> : null}

          <TouchableOpacity style={[styles.mainButton, sending && styles.mainButtonOff]} onPress={submit} disabled={sending} accessibilityLabel="Send request">
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainButtonText}>Send request</Text>}
          </TouchableOpacity>
          {progress ? <Text style={styles.progress}>{progress}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  } else {
    // ---------- no request is possible ----------
    body = (
      <View style={styles.center}>
        <View style={styles.emptyCircle}><Icon name="information-circle-outline" size={44} color={COLORS.primary} /></View>
        <Text style={styles.centerTitle}>A refund is not possible now</Text>
        <Text style={styles.centerText}>{(order && order.refund_blocked_reason) || 'This order cannot be refunded.'}</Text>
        <TouchableOpacity style={styles.mainButton} onPress={() => navigation.goBack()}><Text style={styles.mainButtonText}>Back to my orders</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityLabel="Back"><Icon name="chevron-back" size={27} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{request_ ? 'Refund request' : 'Request a refund'}</Text>
          <Text style={styles.headerSub}>Order #{orderId}</Text>
        </View>
      </View>
      {body}
      <ImageViewer visible={viewer.open} images={viewer.list} startIndex={viewer.start} onClose={() => setViewer((v) => ({ ...v, open: false }))} />
    </View>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : Platform.OS === 'ios' ? 50 : 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingTop: TOP, paddingBottom: 12, paddingHorizontal: 8 },
  back: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.88)' },
  content: { padding: 12 },
  center: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 56 },
  centerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink, marginTop: 14, textAlign: 'center' },
  centerText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  mainButton: { height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, marginTop: 16 },
  mainButtonOff: { opacity: 0.6 },
  mainButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: '#fff', marginTop: 4 },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '800', fontSize: 14, marginLeft: 8 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.primarySoft, borderRadius: 12, padding: 12, marginBottom: 10 },
  infoText: { flex: 1, marginLeft: 8, fontSize: 13, lineHeight: 19, color: COLORS.primaryDark },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1e4ea' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 10 },
  cardHint: { fontSize: 12, color: COLORS.muted, marginTop: -4, marginBottom: 10 },
  statusTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  statusTagText: { fontSize: 13, fontWeight: '800', marginLeft: 6 },
  hint: { fontSize: 14, color: COLORS.text, lineHeight: 21, marginTop: 10 },
  noteBox: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, marginTop: 12 },
  noteTitle: { fontSize: 12, fontWeight: '800', color: COLORS.muted },
  noteText: { fontSize: 14, color: COLORS.ink, marginTop: 4, lineHeight: 20 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  lineLabel: { fontSize: 13, color: COLORS.muted },
  lineValue: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  detailsText: { fontSize: 14, color: COLORS.text, lineHeight: 21, backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, marginTop: 8 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  proofWrap: { marginRight: 10, marginBottom: 10 },
  proofPhoto: { width: 84, height: 84, borderRadius: 12, backgroundColor: '#eee', marginRight: 10, marginBottom: 4 },
  removeButton: { position: 'absolute', top: -6, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  addPhoto: { width: 84, height: 84, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryTint },
  addPhotoText: { color: COLORS.primary, fontSize: 12, fontWeight: '800', marginTop: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  itemPhoto: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#f2f2f2', marginHorizontal: 10 },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryTint },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: COLORS.ink, fontWeight: '600' },
  itemSub: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  pickRow: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  pickRowOn: { backgroundColor: COLORS.primaryTint, borderColor: '#ffd1e3' },
  pickMain: { flexDirection: 'row', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 6, marginRight: 6 },
  stepButton: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  stepNumber: { minWidth: 34, textAlign: 'center', fontSize: 15, fontWeight: '800', color: COLORS.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip: { borderWidth: 1.5, borderColor: '#f0d2e0', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#fff' },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  chipTextOn: { color: '#fff' },
  input: { minHeight: 110, borderWidth: 1, borderColor: '#e6dce3', borderRadius: 12, padding: 12, fontSize: 15, color: COLORS.ink, backgroundColor: COLORS.bg, marginTop: 4 },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: COLORS.muted, marginTop: 4 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f1e4ea' },
  summaryLabel: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  summaryValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  summaryNote: { fontSize: 12, color: COLORS.muted, marginTop: 6, marginBottom: 6, textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDE9E7', borderRadius: 12, padding: 12, marginTop: 6 },
  errorText: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '700', color: COLORS.danger },
  progress: { textAlign: 'center', fontSize: 13, color: COLORS.muted, marginTop: 10 },
});