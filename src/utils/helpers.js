export function fmtPrice(cents) {
  return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
}
