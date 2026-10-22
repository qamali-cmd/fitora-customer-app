// src/screens/WriteReviewScreen.js
// A customer rates a product from a completed order: stars, a comment, up to 5 photos, and 1 video.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import API from '../api/config';
import { request } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { pickMedia, uploadReviewMedia, MAX_PHOTOS, MAX_VIDEO_SECONDS } from '../utils/mediaUpload';

const RATING_WORDS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export default function WriteReviewScreen({ navigation, route }) {
  const { orderId, productId, productName } = route.params;
  const { token } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [progress, setProgress] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function addPhotos() {
    setError('');
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return setError(`You can add up to ${MAX_PHOTOS} photos.`);
    try {
      const picked = await pickMedia('photo', room);
      setPhotos((current) => [...current, ...picked].slice(0, MAX_PHOTOS));
    } catch (err) {
      setError(err.message);
    }
  }

  async function addVideo() {
    setError('');
    try {
      const picked = await pickMedia('video', 1);
      if (picked[0]) setVideo(picked[0]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit() {
    setError('');
    setSending(true);
    try {
      const files = [...photos, ...(video ? [video] : [])];
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        const label = `Uploading ${i + 1} of ${files.length}`;
        setProgress(`${label}...`);
        uploaded.push(await uploadReviewMedia(files[i], (percent) => setProgress(`${label}... ${percent}%`)));
      }
      setProgress('Submitting your review...');
      await request(`${API.PRODUCTS}/products/${productId}/reviews`, {
        method: 'POST',
        token,
        body: { order_id: orderId, rating, comment: comment.trim(), media: uploaded },
      });
      Alert.alert('Thank you for your review!', 'Your review was submitted. It will appear on the product page once the shop approves it.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
      setProgress('');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>How was your product?</Text>
      <Text style={styles.productName} numberOfLines={2}>{productName}</Text>

      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, n <= rating && styles.starOn]}>{n <= rating ? '★' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingWord}>{RATING_WORDS[rating - 1]}</Text>

      <Text style={styles.label}>Share more about this product (optional)</Text>
      <TextInput
        style={styles.input}
        value={comment}
        onChangeText={setComment}
        placeholder="What did you like? How is the quality?"
        multiline
        maxLength={500}
      />
      <Text style={styles.counter}>{comment.length}/500</Text>

      <Text style={styles.label}>Add photos and a video (optional)</Text>
      <Text style={styles.hint}>Up to {MAX_PHOTOS} photos and 1 video of up to {MAX_VIDEO_SECONDS} seconds.</Text>
      <View style={styles.pickRow}>
        <TouchableOpacity style={styles.pickButton} onPress={addPhotos} disabled={sending}>
          <Text style={styles.pickText}>📷 Add photos ({photos.length}/{MAX_PHOTOS})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickButton} onPress={addVideo} disabled={sending}>
          <Text style={styles.pickText}>🎬 {video ? 'Change video' : 'Add video'}</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 || video ? (
        <View style={styles.thumbs}>
          {photos.map((p, i) => (
            <View key={p.uri + i} style={styles.thumbWrap}>
              <Image source={{ uri: p.uri }} style={styles.thumb} />
              {!sending ? (
                <TouchableOpacity style={styles.remove} onPress={() => setPhotos((cur) => cur.filter((_, idx) => idx !== i))}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}
          {video ? (
            <View style={[styles.thumbWrap, styles.videoTile]}>
              <Text style={styles.videoIcon}>🎬</Text>
              <Text style={styles.videoLabel}>Video</Text>
              {!sending ? (
                <TouchableOpacity style={styles.remove} onPress={() => setVideo(null)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.submit, sending && styles.submitDisabled]} onPress={handleSubmit} disabled={sending}>
        {sending ? (
          <View style={styles.sendingRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.submitText}>  {progress}</Text>
          </View>
        ) : (
          <Text style={styles.submitText}>Submit review</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 20, paddingBottom: 50 },
  heading: { fontSize: 20, fontWeight: 'bold', color: '#111111' },
  productName: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 18 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  star: { fontSize: 44, color: '#ccc' },
  starOn: { color: '#f4a729' },
  ratingWord: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#111111', marginTop: 2, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#111111', marginBottom: 6, marginTop: 6 },
  hint: { fontSize: 12, color: '#888', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
  counter: { textAlign: 'right', fontSize: 11, color: '#999', marginTop: 4, marginBottom: 8 },
  pickRow: { flexDirection: 'row', gap: 10 },
  pickButton: { flex: 1, borderWidth: 1, borderColor: PRIMARY, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  pickText: { color: PRIMARY, fontSize: 13, fontWeight: '600' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  thumbWrap: { width: 82, height: 82, borderRadius: 8, overflow: 'visible' },
  thumb: { width: 82, height: 82, borderRadius: 8, backgroundColor: '#eee' },
  videoTile: { backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' },
  videoIcon: { fontSize: 24 },
  videoLabel: { color: '#fff', fontSize: 11, marginTop: 2 },
  remove: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  error: { color: '#e74c3c', textAlign: 'center', marginTop: 16, fontSize: 13 },
  submit: { backgroundColor: PRIMARY, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 22 },
  submitDisabled: { backgroundColor: '#fda6c6' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sendingRow: { flexDirection: 'row', alignItems: 'center' },
});