// src/utils/addressUtils.js
// Turns a saved address into the lines that are shown on screen.

export function addressLines(a) {
  return {
    line1: a.street || '',
    line2: [a.barangay_name ? `Brgy. ${a.barangay_name}` : null, a.city_name, a.province_name, a.region_name, a.zip_code]
      .filter(Boolean)
      .join(', '),
    landmark: a.landmark || '',
  };
}