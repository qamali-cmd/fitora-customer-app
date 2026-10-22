// src/utils/dialogs.js
// Gives every pop-up message in the app the Fitora look (Alert.alert is replaced).
// The screens do not need to change: they keep calling Alert.alert(...), and this file draws it.

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PRIMARY = '#fc408c';

const ICONS = {
  success: { symbol: '✓', color: PRIMARY, soft: '#ffe8f1' },
  error: { symbol: '!', color: '#e74c3c', soft: '#fdeaea' },
  warning: { symbol: '!', color: '#f4a729', soft: '#fdf3e3' },
  question: { symbol: '?', color: '#111111', soft: '#eeeeee' },
  info: { symbol: 'i', color: '#111111', soft: '#eeeeee' },
};

// Chooses the icon and color from the words of the message
export function inferType(title, message, buttons) {
  const text = `${title} ${message}`.toLowerCase();
  if (String(title).trim().endsWith('?')) return 'question';
  if (buttons.some((b) => b.style === 'destructive')) return 'warning';
  if (/\b(error|could not|cannot|can't|unable|failed|invalid|not enough|not available|problem)\b/.test(text)) return 'error';
  if (/\b(thank|success|submitted|placed|updated|saved|verified|sent|completed|approved|received|cancelled|deleted|added|done)\b/.test(text)) return 'success';
  return buttons.length > 1 ? 'question' : 'info';
}

// ---------- the list of pop-ups waiting to be shown ----------
let current = null;
let setter = null;
const queue = [];

export function attachHost(fn) {
  setter = fn;
  if (current) fn(current);
  return () => {
    if (setter === fn) setter = null;
  };
}

function showNext() {
  if (current) return; // something is already on the screen, so the waiting ones keep waiting
  current = queue.shift() || null;
  if (setter) setter(current);
}

export function showDialog(config) {
  queue.push(config);
  if (!current) showNext();
}

// A button was pressed: close the pop-up first, then run what the button should do
export function pressButton(button) {
  current = null;
  if (setter) setter(null);
  setTimeout(showNext, 150); // the next pop-up (if any) appears right after
  if (button && typeof button.onPress === 'function') button.onPress();
}

// The phone's back button
export function dismissDialog() {
  if (!current) return;
  const cancelButton = current.buttons.find((b) => b.style === 'cancel');
  if (cancelButton) {
    pressButton(cancelButton);
  } else if (current.cancelable) {
    const done = current.onDismiss;
    pressButton(null);
    if (typeof done === 'function') done();
  }
}

// A tap outside the box (only closes pop-ups that allow it, like the normal phone pop-up)
export function dismissOutside() {
  if (current && current.cancelable) dismissDialog();
}

// From now on, Alert.alert(title, message, buttons, options) shows the Fitora pop-up
Alert.alert = (title, message, buttons, options) => {
  const list = Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  showDialog({
    title: title == null ? '' : String(title),
    message: message == null ? '' : String(message),
    buttons: list,
    cancelable: !!(options && options.cancelable),
    onDismiss: options && options.onDismiss,
    type: inferType(title == null ? '' : String(title), message == null ? '' : String(message), list),
  });
};

// ---------- how it looks ----------
export function DialogView({ dialog, onPress, onOutside, cardStyle }) {
  const icon = ICONS[dialog.type] || ICONS.info;
  const cancels = dialog.buttons.filter((b) => b.style === 'cancel');
  const others = dialog.buttons.filter((b) => b.style !== 'cancel');
  const ordered = [...cancels, ...others];
  const sideBySide = ordered.length === 2;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onOutside} />
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={[styles.iconRing, { backgroundColor: icon.soft }]}>
          <View style={[styles.iconCircle, { backgroundColor: icon.color }]}>
            <Text style={styles.iconSymbol}>{icon.symbol}</Text>
          </View>
        </View>
        {dialog.title ? <Text style={styles.title}>{dialog.title}</Text> : null}
        {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
        <View style={[styles.buttons, sideBySide && styles.buttonsRow]}>
          {ordered.map((button, i) => {
            const kind = button.style === 'cancel' ? 'cancel' : button.style === 'destructive' ? 'danger' : 'primary';
            return (
              <TouchableOpacity
                key={`${button.text}-${i}`}
                style={[styles.button, styles[`${kind}Button`], sideBySide && styles.buttonHalf]}
                onPress={() => onPress(button)}
              >
                <Text style={[styles.buttonText, kind === 'cancel' && styles.cancelText]}>{button.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

// Put <DialogHost /> once in App.js
export function DialogHost() {
  const [dialog, setDialog] = useState(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => attachHost(setDialog), []);

  useEffect(() => {
    if (dialog) {
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
    }
  }, [dialog, progress]);

  if (!dialog) return null;
  const cardStyle = {
    opacity: progress,
    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
  };
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismissDialog}>
      <DialogView dialog={dialog} onPress={pressButton} onOutside={dismissOutside} cardStyle={cardStyle} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 20,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  iconRing: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  iconCircle: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  iconSymbol: { color: '#fff', fontSize: 32, fontWeight: 'bold', lineHeight: 38 },
  title: { fontSize: 19, fontWeight: 'bold', color: '#111111', textAlign: 'center' },
  message: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  buttons: { width: '100%', marginTop: 22 },
  buttonsRow: { flexDirection: 'row', gap: 10 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  buttonHalf: { flex: 1, marginBottom: 0 },
  primaryButton: { backgroundColor: PRIMARY },
  dangerButton: { backgroundColor: '#e74c3c' },
  cancelButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e2e2' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelText: { color: '#555' },
});