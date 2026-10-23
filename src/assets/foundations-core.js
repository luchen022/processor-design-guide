// Pure teaching models. A carry is labelled separately from signed overflow.
export function decimal(raw, min = 0, max = 1e12) {
  const value = String(raw).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) throw new Error('请输入完整的十进制数。');
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`请输入 ${min}～${max} 范围内的数。`);
  return number;
}
const integer = (value, min, max) => {
  const number = decimal(value, min, max);
  if (!Number.isInteger(number)) throw new Error('这里需要整数。');
  return number;
};
export function cpuTime(millionInstructions, cpi, ghz) {
  return decimal(millionInstructions, 0.000001) * decimal(cpi, 0.000001, 1e6) / (1000 * decimal(ghz, 0.000001, 1e6));
}
export function amdahl(fraction, localSpeedup) {
  const p = decimal(fraction, 0, 1), s = decimal(localSpeedup, 1, 1e6);
  const unchanged = 1 - p, improved = p / s, time = unchanged + improved;
  return { unchanged, improved, time, speedup: 1 / time, limit: p === 1 ? Infinity : 1 / unchanged };
}
export function gate(op, a, b = 0) {
  a = integer(a, 0, 1); b = integer(b, 0, 1);
  const values = { AND: a & b, OR: a | b, XOR: a ^ b, NAND: 1 - (a & b), NOR: 1 - (a | b), XNOR: 1 - (a ^ b), NOT: 1 - a };
  if (!(op in values)) throw new Error('未知逻辑门。');
  return values[op];
}
export const kmapOrder = [0, 2, 6, 4, 1, 3, 7, 5];
export function minimize3(cells) {
  if (!Array.isArray(cells) || cells.length !== 8 || cells.some(v => ![0, 1, 'X'].includes(v))) throw new Error('需要 8 个值为 0、1 或 X 的最小项。');
  const required = cells.reduce((mask, v, i) => v === 1 ? mask | (1 << i) : mask, 0);
  if (!required) return { expression: '0', terms: [] };
  const candidates = [];
  for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) {
    const pattern = [a, b, c], members = [];
    for (let m = 0; m < 8; m++) if (pattern.every((bit, i) => bit === -1 || bit === ((m >> (2 - i)) & 1))) members.push(m);
    if (members.some(m => cells[m] === 0)) continue;
    const cover = members.reduce((mask, m) => cells[m] === 1 ? mask | (1 << m) : mask, 0);
    if (!cover) continue;
    const literals = pattern.filter(bit => bit !== -1).length;
    const label = pattern.map((bit, i) => bit === -1 ? '' : (bit === 0 ? '¬' : '') + 'ABC'[i]).join('') || '1';
    candidates.push({ label, members, cover, literals });
  }
  // Eight minterms permit an exhaustive cover DP: minimize terms, then literals.
  const best = Array(256).fill(null); best[0] = { terms: [], literals: 0 };
  const better = (a, b) => !b || a.terms.length < b.terms.length || (a.terms.length === b.terms.length && a.literals < b.literals);
  for (let mask = 0; mask < 256; mask++) if (best[mask]) {
    for (const term of candidates) {
      const next = mask | term.cover;
      if (next === mask) continue;
      const solution = { terms: [...best[mask].terms, term], literals: best[mask].literals + term.literals };
      if (better(solution, best[next])) best[next] = solution;
    }
  }
  const terms = best[required].terms;
  return { expression: terms.map(term => term.label).join(' + '), terms };
}
export function add4(a, b, subtract = false) {
  a = integer(a, 0, 15); b = integer(b, 0, 15);
  const adjusted = subtract ? b ^ 15 : b, rows = [];
  let carry = subtract ? 1 : 0, result = 0;
  for (let bit = 0; bit < 4; bit++) {
    const x = (a >> bit) & 1, y = (adjusted >> bit) & 1, sum = x ^ y ^ carry, out = (x & y) | ((x ^ y) & carry);
    rows.push({ bit, a: x, b: y, carryIn: carry, sum, carryOut: out });
    result |= sum << bit; carry = out;
  }
  return { result, carry, rows, adjusted, exact: subtract ? a - b : a + b };
}
export function route4(select, data, enabled = true) {
  select = integer(select, 0, 3);
  if (!Array.isArray(data) || data.length !== 4) throw new Error('需要 4 路输入。');
  data = data.map(value => integer(value, 0, 255));
  return { selected: data[select], decoder: data.map((_, i) => Number(enabled && i === select)) };
}
export function capture4(q, d, enabled, clearLow, risingEdge) {
  q = integer(q, 0, 15); d = integer(d, 0, 15);
  return clearLow ? 0 : risingEdge && enabled ? d : q;
}
export function detectorStep(state, input) {
  state = integer(state, 0, 2); input = integer(input, 0, 1);
  return { next: input ? Math.min(2, state + 1) : 0, output: Number(state === 2 && input === 1) };
}
