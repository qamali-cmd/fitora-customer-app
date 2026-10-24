// src/components/ImageViewer.js
// A full-screen photo viewer (like in a big shopping app): swipe to the next photo, PINCH with two fingers to zoom in or out
// (exactly where you pinch), drag the enlarged photo with one finger, or double-tap to zoom. The X (or the back button of the
// phone) closes it. It is used for the product photos and the review photos. It needs no extra package.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Modal, Dimensions, Platform, StatusBar, StyleSheet, PanResponder } from 'react-native';
import Icon from './Icon';
import { IDENTITY, distance, midpoint, pinchView, panView, limitView, doubleTapView, settleView } from '../utils/zoomMath';

const { width: W, height: H } = Dimensions.get('window');
const BOX_H = H * 0.8;                       // the photo is shown whole ("contain") inside this box
const DIMS = { viewW: W, viewH: H, boxH: BOX_H };

// a bigger copy of a Cloudinary photo (not cut: the whole picture is kept)
function big(url) {
  if (typeof url !== 'string' || url.indexOf('/image/upload/') === -1) return url;
  if (/\/image\/upload\/[^/]*(w_|c_|f_|q_)/.test(url)) return url;
  return url.replace('/image/upload/', '/image/upload/w_1400,q_auto,f_auto/');
}

const touchesOf = (e) => (e && e.nativeEvent && e.nativeEvent.touches) || [];

function Page({ uri, index, active, onZoomChange }) {
  const [view, setView] = useState(IDENTITY);
  const viewRef = useRef(IDENTITY);          // the newest view (the finger handlers read it)
  const activeRef = useRef(active);
  activeRef.current = active;
  const gesture = useRef(null);              // what the fingers started from
  const frame = useRef(null);
  const lastTap = useRef(0);
  const box = useRef(null);
  const center = useRef({ x: W / 2, y: H / 2 });   // the middle of the photo area, on the screen

  const apply = (next) => {
    viewRef.current = next;
    setView(next);
    if (activeRef.current) onZoomChange(next.scale > 1.02);
  };
  const stopAnimation = () => { if (frame.current) { cancelAnimationFrame(frame.current); frame.current = null; } };
  // a short smooth move to a new view (double-tap, or springing back to normal size)
  const animateTo = (target) => {
    stopAnimation();
    const from = viewRef.current;
    const began = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - began) / 180);
      const e = 1 - Math.pow(1 - k, 3);
      apply({ scale: from.scale + (target.scale - from.scale) * e, tx: from.tx + (target.tx - from.tx) * e, ty: from.ty + (target.ty - from.ty) * e });
      frame.current = k < 1 ? requestAnimationFrame(step) : null;
    };
    step();
  };
  useEffect(() => () => stopAnimation(), []);
  // a photo that is not the one on the screen goes back to normal size
  useEffect(() => { if (!active && viewRef.current.scale !== 1) { stopAnimation(); apply(IDENTITY); } }, [active]);

  const begin = (e) => {
    const t = touchesOf(e);
    if (!t.length) return;
    gesture.current = {
      start: viewRef.current,
      count: t.length,
      startDist: t.length >= 2 ? distance(t[0], t[1]) : 0,
      startMid: t.length >= 2 ? midpoint(t[0], t[1]) : { x: t[0].pageX, y: t[0].pageY },
    };
  };
  const move = (e) => {
    const t = touchesOf(e);
    const g = gesture.current;
    if (!t.length) return;
    if (!g || g.count !== t.length || (t.length >= 2 && !g.startDist)) { begin(e); return; }   // a finger was added or lifted: start again from here (no jump)
    if (t.length >= 2) {
      apply(pinchView({ start: g.start, startMid: g.startMid, mid: midpoint(t[0], t[1]), startDist: g.startDist, dist: distance(t[0], t[1]), center: center.current }));
    } else if (g.start.scale > 1.02) {
      apply(limitView(panView({ start: g.start, startPoint: g.startMid, point: { x: t[0].pageX, y: t[0].pageY } }), DIMS));
    }
  };
  const finish = () => {
    gesture.current = null;
    const settled = settleView(viewRef.current, DIMS);
    const now = viewRef.current;
    if (settled.scale !== now.scale || settled.tx !== now.tx || settled.ty !== now.ty) animateTo(settled);
  };

  const panRef = useRef(null);
  if (!panRef.current) panRef.current = PanResponder.create({
    // two fingers = pinch. One finger moving on an enlarged photo = drag. Otherwise the swipe between photos works as usual.
    onStartShouldSetPanResponderCapture: (e) => touchesOf(e).length >= 2,
    onMoveShouldSetPanResponderCapture: (e, g) => touchesOf(e).length >= 2 || (viewRef.current.scale > 1.02 && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4)),
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { stopAnimation(); begin(e); },
    onPanResponderMove: (e) => move(e),
    onPanResponderRelease: () => finish(),
    onPanResponderTerminate: () => finish(),
  });
  const pan = panRef.current;

  function onPress(e) {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      lastTap.current = 0;
      const ne = e && e.nativeEvent;
      const point = ne && ne.pageX != null ? { x: ne.pageX, y: ne.pageY } : center.current;
      animateTo(doubleTapView({ view: viewRef.current, point, center: center.current }));
    } else {
      lastTap.current = now;
    }
  }

  return (
    <View
      ref={box}
      style={{ width: W, height: H, justifyContent: 'center', overflow: 'hidden' }}
      onLayout={() => { if (box.current && box.current.measureInWindow) box.current.measureInWindow((x, y, w, h) => { if (w && h) center.current = { x: x + w / 2, y: y + h / 2 }; }); }}
      {...pan.panHandlers}
    >
      <TouchableOpacity activeOpacity={1} onPress={onPress} accessibilityLabel="Photo">
        <View testID={`viewer-photo-${index}`} style={{ width: W, height: BOX_H, transform: [{ translateX: view.tx }, { translateY: view.ty }, { scale: view.scale }] }}>
          <Image source={{ uri: big(uri) }} style={{ width: W, height: BOX_H }} resizeMode="contain" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function ImageViewer({ visible, images = [], startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => { if (visible) { setIndex(startIndex); setZoomed(false); } }, [visible, startIndex]);

  const pageOf = (e) => Math.max(0, Math.min(images.length - 1, Math.round(e.nativeEvent.contentOffset.x / W)));

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(startIndex, Math.max(0, images.length - 1))}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          onScroll={(e) => setIndex(pageOf(e))}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => { setIndex(pageOf(e)); setZoomed(false); }}
          renderItem={({ item, index: i }) => <Page uri={item} index={i} active={i === index} onZoomChange={setZoomed} />}
        />
        <View style={styles.top} pointerEvents="box-none">
          <View style={styles.counter}><Text style={styles.counterText}>{index + 1}/{images.length}</Text></View>
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Close the photo"><Icon name="close" size={22} color="#fff" /></TouchableOpacity>
        </View>
        <View style={styles.hintBox} pointerEvents="none"><Text style={styles.hint}>{zoomed ? 'Pinch or double-tap to zoom out' : 'Pinch or double-tap to zoom in'}</Text></View>
      </View>
    </Modal>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : Platform.OS === 'ios' ? 54 : 14;
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: TOP, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  hintBox: { position: 'absolute', bottom: 34, left: 0, right: 0, alignItems: 'center' },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
});