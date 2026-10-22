// src/components/BirthdayPicker.js
// A simple calendar for choosing a birthday (no extra package needed).
// Tap the "Month Year" title to jump to a year, then pick the month and the day.
// value / onChange use the text format YYYY-MM-DD (the same format the server expects).

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseIso(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text || '')) return null;
  const [y, m, d] = text.split('-').map(Number);
  return { y, m: m - 1, d };
}

export function formatDisplayDate(text) {
  const p = parseIso(text);
  if (!p) return '';
  return new Date(p.y, p.m, p.d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Empty slots before the 1st of the month, then the day numbers (used to draw the calendar grid)
export function buildMonthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function BirthdayPicker({ value, onChange, placeholder = 'Select your birthday', minAge = 13 }) {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate()); // youngest allowed
  const maxYear = maxDate.getFullYear();
  const minYear = today.getFullYear() - 120;
  const selected = parseIso(value);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('days'); // 'days' | 'months' | 'years'
  const [viewYear, setViewYear] = useState(maxYear);
  const [viewMonth, setViewMonth] = useState(0);
  const [pending, setPending] = useState(null);

  function openPicker() {
    if (selected) {
      setViewYear(selected.y);
      setViewMonth(selected.m);
    } else {
      setViewYear(Math.min(maxYear, today.getFullYear() - 20)); // start around age 20 so there is less scrolling
      setViewMonth(0);
    }
    setPending(selected);
    setMode('days');
    setOpen(true);
  }

  function isDayDisabled(day) {
    return new Date(viewYear, viewMonth, day) > maxDate;
  }

  function changeMonth(delta) {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 0) { month = 11; year -= 1; }
    if (month > 11) { month = 0; year += 1; }
    if (year > maxYear || year < minYear) return;
    setViewMonth(month);
    setViewYear(year);
  }

  function confirm() {
    if (pending) onChange(`${pending.y}-${pad(pending.m + 1)}-${pad(pending.d)}`);
    setOpen(false);
  }

  const years = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);
  const cells = buildMonthCells(viewYear, viewMonth);

  return (
    <View>
      <TouchableOpacity style={styles.field} onPress={openPicker} activeOpacity={0.7}>
        <Text style={[styles.fieldText, !selected && styles.placeholder]}>
          {selected ? formatDisplayDate(value) : placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Header: previous / title / next */}
            <View style={styles.header}>
              {mode === 'days' ? (
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrow}>
                  <Text style={styles.arrowText}>‹</Text>
                </TouchableOpacity>
              ) : <View style={styles.arrow} />}

              <TouchableOpacity onPress={() => setMode(mode === 'years' ? 'days' : 'years')}>
                <Text style={styles.title}>
                  {mode === 'years' ? 'Choose a year' : mode === 'months' ? `${viewYear}` : `${MONTH_NAMES[viewMonth]} ${viewYear}`} ▾
                </Text>
              </TouchableOpacity>

              {mode === 'days' ? (
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrow}>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
              ) : <View style={styles.arrow} />}
            </View>

            {/* Years */}
            {mode === 'years' ? (
              <ScrollView style={styles.yearScroll} contentContainerStyle={styles.grid}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.gridCell4, y === viewYear && styles.cellActive]}
                    onPress={() => { setViewYear(y); setMode('months'); }}
                  >
                    <Text style={[styles.cellText, y === viewYear && styles.cellTextActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}

            {/* Months */}
            {mode === 'months' ? (
              <View style={styles.grid}>
                {MONTH_NAMES.map((name, index) => {
                  const disabled = viewYear === maxYear && index > maxDate.getMonth();
                  return (
                    <TouchableOpacity
                      key={name}
                      disabled={disabled}
                      style={[styles.gridCell3, index === viewMonth && styles.cellActive]}
                      onPress={() => { setViewMonth(index); setMode('days'); }}
                    >
                      <Text style={[styles.cellText, index === viewMonth && styles.cellTextActive, disabled && styles.disabledText]}>
                        {name.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {/* Days */}
            {mode === 'days' ? (
              <View>
                <View style={styles.grid}>
                  {WEEKDAYS.map((w, i) => (
                    <View key={i} style={styles.dayCell}>
                      <Text style={styles.weekday}>{w}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.grid}>
                  {cells.map((day, index) => {
                    if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />;
                    const disabled = isDayDisabled(day);
                    const isPending = pending && pending.y === viewYear && pending.m === viewMonth && pending.d === day;
                    return (
                      <TouchableOpacity
                        key={day}
                        disabled={disabled}
                        style={styles.dayCell}
                        onPress={() => setPending({ y: viewYear, m: viewMonth, d: day })}
                      >
                        <View style={[styles.dayCircle, isPending && styles.cellActive]}>
                          <Text style={[styles.dayText, isPending && styles.cellTextActive, disabled && styles.disabledText]}>{day}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.selectedText}>
                  {pending ? formatDisplayDate(`${pending.y}-${pad(pending.m + 1)}-${pad(pending.d)}`) : 'Tap a day'}
                </Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.okButton, !pending && styles.okDisabled]} onPress={confirm} disabled={!pending}>
                <Text style={styles.okText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, marginBottom: 12,
  },
  fieldText: { fontSize: 15, color: '#2B2140' },
  placeholder: { color: '#aaa' },
  icon: { fontSize: 18 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  arrow: { width: 40, alignItems: 'center' },
  arrowText: { fontSize: 28, color: PRIMARY, fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: '700', color: '#2B2140' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  yearScroll: { maxHeight: 280 },
  gridCell4: { width: '25%', paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  gridCell3: { width: '33.33%', paddingVertical: 16, alignItems: 'center', borderRadius: 8 },
  cellActive: { backgroundColor: PRIMARY },
  cellText: { fontSize: 15, color: '#2B2140' },
  cellTextActive: { color: '#fff', fontWeight: '700' },
  disabledText: { color: '#ccc' },

  dayCell: { width: '14.2857%', alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, color: '#2B2140' },
  weekday: { fontSize: 12, color: '#888', fontWeight: '600' },
  selectedText: { textAlign: 'center', color: PRIMARY, fontWeight: '600', marginTop: 10, fontSize: 14 },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  cancelText: { color: '#555', fontSize: 14 },
  okButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, backgroundColor: PRIMARY },
  okDisabled: { backgroundColor: '#b8b0f0' },
  okText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});