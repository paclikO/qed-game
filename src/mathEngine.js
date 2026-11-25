// Exact rational arithmetic + expression evaluators + solvability check.

export const S = null; // slot marker in level templates
export const OPS = new Set(['+', '−', '×', '÷']);

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

export class Frac {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('division by zero');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { return new Frac(this.n * o.d, this.d * o.n); }
  pow(o) {
    if (o.d !== 1 || Math.abs(o.n) > 12) throw new Error('unsupported exponent');
    const e = Math.abs(o.n);
    const r = new Frac(this.n ** e, this.d ** e);
    return o.n < 0 ? new Frac(1).div(r) : r;
  }
  eq(o) { return o !== null && this.n === o.n && this.d === o.d; }
  toString() { return (this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`).replace('-', '−'); }
}

export const frac = (n, d = 1) => new Frac(n, d);

/** Parse a token text as a number ('3', '−2'); throws for operators. */
export function num(text) {
  if (OPS.has(text)) throw new Error('not a number');
  const v = Number(text.replace('−', '-'));
  if (!Number.isInteger(v)) throw new Error('not an integer');
  return new Frac(v);
}

export const isNegative = (text) => !OPS.has(text) && text.startsWith('−');

const safe = (fn) => (vals) => { try { return fn(vals); } catch { return null; } };

/**
 * number op number op number … with × ÷ before + −.
 * A '−' where a number is expected is a sign (unary minus): "− 2 × 3", "4 × − 2".
 * A negative number token directly after a number ("− 4 −2", "2 −2 × 4") acts as subtraction ("+ −2").
 */
export const evalArith = safe((vals) => {
  const nums = [], ops = [];
  let i = 0;
  while (i < vals.length) {
    let sign = 1;
    if (vals[i] === '−') { sign = -1; i += 1; }
    if (i >= vals.length) return null;
    nums.push(num(vals[i]).mul(frac(sign))); // throws if it's an operator
    i += 1;
    if (i === vals.length) break;
    if (OPS.has(vals[i])) {
      ops.push(vals[i]);
      i += 1;
      if (i === vals.length) return null; // trailing operator
    } else if (isNegative(vals[i])) {
      ops.push('+'); // "a −2" reads as "a − 2" = a + (−2)
    } else {
      throw new Error('expected operator');
    }
  }
  if (!nums.length) return null;
  const terms = [nums[0]], signs = [];
  ops.forEach((op, i) => {
    const n = nums[i + 1];
    if (op === '×') terms[terms.length - 1] = terms[terms.length - 1].mul(n);
    else if (op === '÷') terms[terms.length - 1] = terms[terms.length - 1].div(n);
    else { signs.push(op); terms.push(n); }
  });
  return signs.reduce((acc, op, i) => (op === '+' ? acc.add(terms[i + 1]) : acc.sub(terms[i + 1])), terms[0]);
});

// a ^ b − c
export const evalPower = safe((v) => { const [a, b, c] = v.map(num); return a.pow(b).sub(c); });
// d/dx (a·x^n) at x
export const evalDerivative = safe((v) => {
  const [a, n, x] = v.map(num);
  return a.mul(n).mul(x.pow(n.sub(frac(1))));
});
// ∫ from c to b of (a·x) dx
export const evalIntegral = safe((v) => {
  const [c, b, a] = v.map(num);
  return a.mul(b.mul(b).sub(c.mul(c))).div(frac(2));
});
// a/b · c/d
export const evalProbability = safe((v) => { const [a, b, c, d] = v.map(num); return a.div(b).mul(c.div(d)); });

evalArith.kind = 'arith';
evalPower.kind = 'power';
evalDerivative.kind = 'derivative';
evalIntegral.kind = 'integral';
evalProbability.kind = 'probability';

// ---------------------------------------------------------------- formula levels of the other schools
// formula(kind, fn): every slot must be a number; fn receives the slot values as Fracs (in template order).
const formula = (kind, fn) => {
  const ev = safe((vals) => {
    if (vals.length !== fn.length) throw new Error('incomplete');
    return fn(...vals.map(num));
  });
  ev.kind = kind;
  return ev;
};
const int = (f) => { if (f.d !== 1) throw new Error('not an integer'); return f.n; };
const sqrtExact = (f) => {
  const r = Math.round(Math.sqrt(int(f)));
  if (r * r !== f.n || f.n < 0) throw new Error('not a perfect square');
  return frac(r);
};
const factorial = (f) => { const n = int(f); if (n < 0 || n > 12) throw new Error('range'); let r = 1; for (let i = 2; i <= n; i++) r *= i; return frac(r); };
const choose = (nf, kf) => {
  const n = int(nf), k = int(kf);
  if (k < 0 || k > n || n > 20) throw new Error('range');
  let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return frac(Math.round(r));
};
const logExact = (bf, xf) => { // integer k with b^k = x
  const b = int(bf), x = int(xf);
  if (b < 2 || x < 1) throw new Error('range');
  let k = 0, p = 1;
  while (p < x) { p *= b; k += 1; }
  if (p !== x) throw new Error('not an exact power');
  return frac(k);
};
const ONE = frac(1), TWO = frac(2), THREE = frac(3);

export const EV = {
  // School of Mathematics
  fractionSum: formula('fraction-sum', (a, b, c, d) => a.div(b).add(c.div(d))),
  // Academy of Algebra
  linear: formula('linear', (a, b, c) => c.sub(b).div(a)),                        // a·x + b = c  →  x
  brackets: formula('brackets', (a, b, c) => a.mul(b.add(c))),                    // a·(b + c)
  squareOfSum: formula('square-of-sum', (a, b) => a.add(b).pow(TWO)),             // (a + b)²
  diffSquares: formula('diff-squares', (a, b) => a.pow(TWO).sub(b.pow(TWO))),     // a² − b²
  polyValue: formula('poly-value', (a, b, x) => x.pow(TWO).add(a.mul(x)).add(b)), // x² + a·x + b at x
  powerProduct: formula('power-product', (a, b, c, d) => a.pow(b).mul(c.pow(d))), // a^b · c^d
  logarithm: formula('logarithm', (b, x) => logExact(b, x)),                      // log_b(x)
  sequence: formula('sequence', (a1, d, n) => a1.add(n.sub(ONE).mul(d))),         // a₁ + (n − 1)·d
  // Institute of Geometry
  triangleAngle: formula('triangle-angle', (a, b) => frac(180).sub(a).sub(b)),
  perimeter: formula('perimeter', (a, b) => TWO.mul(a.add(b))),
  product2: formula('product-2', (a, b) => a.mul(b)),
  pythagoras: formula('pythagoras', (a, b) => sqrtExact(a.pow(TWO).add(b.pow(TWO)))),
  triangleArea: formula('triangle-area', (a, b) => a.mul(b).div(TWO)),
  circleArea: formula('circle-area', (a, b) => a.add(b).pow(TWO)),               // π·(a + b)²  (shown as k·π)
  product3: formula('product-3', (a, b, c) => a.mul(b).mul(c)),
  polygonAngles: formula('polygon-angles', (n, k) => n.sub(TWO).mul(k)),          // (n − 2)·k
  // University of Calculus
  limitLinear: formula('limit-linear', (x0, a, b) => a.mul(x0).add(b)),           // lim x→x0 (a·x + b)
  powerRule: formula('power-rule', (a, n, x) => a.mul(n).mul(x.pow(n.sub(ONE)))),
  secondDerivative: formula('second-derivative', (a, n, x) => a.mul(n).mul(n.sub(ONE)).mul(x.pow(n.sub(TWO)))),
  chainRule: formula('chain-rule', (a, b, n) => n.mul(a).mul(a.add(b).pow(n.sub(ONE)))), // d/dx (a·x + b)^n at x = 1
  vertex: formula('vertex', (a, b) => b.div(TWO.mul(a))),                         // a·x² − b·x  →  x of the vertex
  integralSquare: formula('integral-square', (b, a) => a.mul(b.pow(THREE)).div(THREE)), // ∫₀ᵇ a·x² dx
  integralConst: formula('integral-const', (c, b, a) => a.mul(b.sub(c))),         // ∫_c^b a dx
  sumK: formula('sum-k', (n, a) => a.mul(n).mul(n.add(ONE)).div(TWO)),            // ∑_{k=1}^n a·k
  // Academy of Statistics
  mean3: formula('mean-3', (a, b, c) => a.add(b).add(c).div(THREE)),
  median3: formula('median-3', (a, b, c) => [a, b, c].sort((p, q) => p.n * q.d - q.n * p.d)[1]),
  range3: formula('range-3', (a, b, c) => { const s = [a, b, c].sort((p, q) => p.n * q.d - q.n * p.d); return s[2].sub(s[0]); }),
  combinations: formula('combinations', (n, k) => choose(n, k)),
  permutations: formula('permutations', (a, b) => factorial(a).div(factorial(b))),
  binomial: formula('binomial', (n, k, m) => choose(n, k).div(TWO.pow(m))),        // C(n,k) / 2^m
  conditional: formula('conditional', (a, b, c, d) => a.div(b).div(c.div(d))),     // (a/b) ÷ (c/d)
  variance2: formula('variance-2', (a, b) => a.sub(b).div(TWO).pow(TWO)),
  // Grand Mathematical University (mixed)
  sumOfPowers: formula('sum-of-powers', (a, b, c, d) => a.pow(b).add(c.pow(d))),
};

/** Free-form levels (plain arithmetic) accept any correct expression up to the tray size. */
export const isFlexible = (level) => level.evaluate.kind === 'arith';

/** Is this tray a finished, correct answer? */
export function isComplete(level, vals) {
  const slots = level.template.filter((p) => p === S).length;
  const lengthOk = isFlexible(level) ? vals.length >= 1 && vals.length <= slots : vals.length === slots;
  return lengthOk && (level.evaluate(vals)?.eq(level.target) ?? false);
}

/** Can the current prefix still be completed to the target using the remaining pool of tokens? */
export function canComplete(level, prefix, pool) {
  const slots = level.template.filter((p) => p === S).length;
  const k = slots - prefix.length;
  if (k < 0 || k > pool.length) return false;
  const chosen = [...prefix];
  const used = new Array(pool.length).fill(false);
  const flexible = isFlexible(level);
  const dfs = () => {
    if (chosen.length && (flexible || chosen.length === slots) && isComplete(level, chosen)) return true;
    if (chosen.length === slots) return false;
    const tried = new Set();
    for (let i = 0; i < pool.length; i++) {
      if (used[i] || tried.has(pool[i])) continue;
      tried.add(pool[i]);
      used[i] = true; chosen.push(pool[i]);
      const ok = dfs();
      used[i] = false; chosen.pop();
      if (ok) return true;
    }
    return false;
  };
  return dfs();
}
