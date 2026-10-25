// Synthetic buggy fixture. No production source or external data.
export function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}
export function canonicalIds(values) {
  return [...new Set(values)];
}
