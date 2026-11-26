// Structured mathematical typesetting renderer for HTML5 Canvas 2D.
// Draws crisp stacked fractions (d/dx, a/b), tall calligraphic integrals & curved parentheses,
// superscripts/subscripts, radicals, limits, and summations for the bottom Tray, Rules board, and Results board.
import { COLORS as C, CHALK_FONT } from './constants.js';
import { S } from './mathEngine.js';

const SERIF = 'Georgia, "Times New Roman", serif';
const mathSerif = (px, { italic = false, bold = false } = {}) => `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${px}px ${SERIF}`;
const chalkNumFont = (px, bold = true) => `${bold ? 'bold ' : ''}${px}px ${CHALK_FONT}`;

// ------------------------------------------------------------------ AST constructors
const txt = (text, opts = {}) => ({ type: 'txt', text, ...opts });
const v = (text, size = 19) => txt(text, { italic: true, size });          // italic math variable (x, f, p, a, n, k…)
const rm = (text, size = 18) => txt(text, { italic: false, size });        // upright roman text (lim, log, sin, mean…)
const op = (text, pad = 5, size = 19) => ({ type: 'op', text, pad, size });
const slot = (idx, size = 'md') => ({ type: 'slot', idx, size });          // 'md' (main) | 'sm' (sub/sup/frac/limit)
const row = (items, gap = 2) => ({ type: 'row', items, gap });
const paren = (inner, opts = {}) => ({ type: 'paren', inner, left: opts.left ?? '(', right: opts.right ?? ')' });
const frac = (num, den, opts = {}) => ({ type: 'frac', num, den, padX: opts.padX ?? 4, gap: opts.gap ?? 2.5 });
const sup = (base, exp) => ({ type: 'sup', base, exp });
const sub = (base, subNode) => ({ type: 'sub', base, subNode });
const sqrt = (inner) => ({ type: 'sqrt', inner });
const evalBar = (expr, atNode) => ({ type: 'evalBar', expr, at: atNode });
const integral = (low, high, body, diff = 'dx') => ({ type: 'integral', low, high, body, diff });
const stackOp = (sym, under, over, body, opts = {}) => ({ type: 'stackOp', sym, under, over, body, ...opts });
const ddx = () => frac(txt('d', { italic: true, size: 14 }), row([txt('d', { italic: true, size: 14 }), txt('x', { italic: true, size: 14 })], 0), { padX: 3, gap: 1.5 });
const sp = (w = 6) => ({ type: 'space', w });

// ------------------------------------------------------------------ level -> math AST
/**
 * Build a structured math AST for any level. Slot indices 0..k-1 strictly match
 * the order expected by level.evaluate() in src/mathEngine.js.
 */
export function levelMathTree(level, { compactArith = false, filledCount = 0 } = {}) {
  const kind = level.evaluate?.kind;
  switch (kind) {
    case 'arith': {
      const total = level.template.filter((p) => p === S).length;
      const n = compactArith && filledCount > 0 ? filledCount : total;
      return row(Array.from({ length: n }, (_, i) => slot(i, 'md')), 6);
    }
    case 'power':
      return row([sup(slot(0, 'md'), slot(1, 'sm')), op('−', 6), slot(2, 'md')]);
    case 'derivative':
    case 'power-rule':
      return row([
        ddx(), sp(3),
        evalBar(
          paren(row([slot(0, 'md'), op('·', 3), sup(v('x', 20), slot(1, 'sm'))], 1)),
          row([v('x', 13), op('=', 2, 13), slot(2, 'sm')], 1),
        ),
      ], 1);
    case 'second-derivative':
      return evalBar(
        sup(paren(row([slot(0, 'md'), op('·', 3), sup(v('x', 20), slot(1, 'sm'))], 1)), rm('″', 18)),
        row([v('x', 13), op('=', 2, 13), slot(2, 'sm')], 1),
      );
    case 'chain-rule':
      return row([
        ddx(), sp(3),
        evalBar(
          sup(paren(row([slot(0, 'md'), op('·', 3), v('x', 19), op('+', 5), slot(1, 'md')], 1)), slot(2, 'sm')),
          row([v('x', 13), op('=', 2, 13), rm('1', 13)], 1),
        ),
      ], 1);
    case 'integral':
      return integral(slot(0, 'sm'), slot(1, 'sm'), paren(row([slot(2, 'md'), op('·', 3), v('x', 19)], 1)), 'dx');
    case 'integral-square':
      return integral(rm('0', 13), slot(0, 'sm'), row([slot(1, 'md'), op('·', 3), sup(v('x', 19), rm('2', 13))], 1), 'dx');
    case 'integral-const':
      return integral(slot(0, 'sm'), slot(1, 'sm'), slot(2, 'md'), 'dx');
    case 'probability':
      return row([v('P', 19), op('=', 5), frac(slot(0, 'sm'), slot(1, 'sm')), op('·', 6), frac(slot(2, 'sm'), slot(3, 'sm'))], 1);
    case 'fraction-sum':
      return row([frac(slot(0, 'sm'), slot(1, 'sm')), op('+', 7), frac(slot(2, 'sm'), slot(3, 'sm'))], 1);
    case 'linear':
      return row([slot(0, 'md'), op('·', 3), v('x', 19), op('+', 5), slot(1, 'md'), op('=', 6), slot(2, 'md'), op('→', 8), v('x', 19)], 1);
    case 'brackets':
      return row([slot(0, 'md'), op('·', 3), paren(row([slot(1, 'md'), op('+', 5), slot(2, 'md')], 1))], 1);
    case 'square-of-sum':
      return sup(paren(row([slot(0, 'md'), op('+', 5), slot(1, 'md')], 1)), rm('2', 14));
    case 'diff-squares':
      return row([sup(slot(0, 'md'), rm('2', 14)), op('−', 6), sup(slot(1, 'md'), rm('2', 14))], 1);
    case 'poly-value':
      return row([
        v('p', 18), paren(v('x', 17)), op('=', 5),
        sup(v('x', 18), rm('2', 13)), op('+', 4), slot(0, 'md'), op('·', 2), v('x', 18), op('+', 4), slot(1, 'md'),
        rm(',', 18), sp(6), v('p', 18), paren(slot(2, 'md')),
      ], 1);
    case 'power-product':
      return row([sup(slot(0, 'md'), slot(1, 'sm')), op('·', 7), sup(slot(2, 'md'), slot(3, 'sm'))], 1);
    case 'sum-of-powers':
      return row([sup(slot(0, 'md'), slot(1, 'sm')), op('+', 7), sup(slot(2, 'md'), slot(3, 'sm'))], 1);
    case 'logarithm':
      return row([sub(rm('log', 19), slot(0, 'sm')), paren(slot(1, 'md'))], 2);
    case 'sequence':
      return row([
        sub(v('a', 19), rm('1', 12)), op('=', 4), slot(0, 'md'), rm(',', 18), sp(5),
        v('d', 19), op('=', 4), slot(1, 'md'), op('→', 7), sub(v('a', 19), slot(2, 'sm')),
      ], 1);
    case 'triangle-angle':
      return row([v('γ', 19), op('=', 5), rm('180°', 18), op('−', 5), sup(slot(0, 'md'), rm('°', 15)), op('−', 5), sup(slot(1, 'md'), rm('°', 15))], 1);
    case 'perimeter':
      return row([v('P', 19), op('=', 5), rm('2', 19), op('·', 3), paren(row([slot(0, 'md'), op('+', 5), slot(1, 'md')], 1))], 1);
    case 'product-2':
      return row([v('A', 19), op('=', 5), slot(0, 'md'), op('·', 5), slot(1, 'md')], 1);
    case 'pythagoras':
      return row([v('c', 19), op('=', 5), sqrt(row([sup(slot(0, 'md'), rm('2', 13)), op('+', 5), sup(slot(1, 'md'), rm('2', 13))], 1))], 1);
    case 'triangle-area':
      return row([v('A', 19), op('=', 5), frac(row([slot(0, 'sm'), op('·', 3), slot(1, 'sm')], 1), rm('2', 16))], 1);
    case 'circle-area':
      return row([v('A', 19), op('=', 5), rm('π', 19), op('·', 3), sup(paren(row([slot(0, 'md'), op('+', 5), slot(1, 'md')], 1)), rm('2', 14))], 1);
    case 'product-3':
      return row([v('V', 19), op('=', 5), slot(0, 'md'), op('·', 4), slot(1, 'md'), op('·', 4), slot(2, 'md')], 1);
    case 'polygon-angles':
      return row([paren(row([slot(0, 'md'), op('−', 5), rm('2', 19)], 1)), op('·', 4), sup(slot(1, 'md'), rm('°', 15))], 1);
    case 'limit-linear':
      return stackOp(
        rm('lim', 17),
        row([v('x', 12), op('→', 2, 12), slot(0, 'sm')], 0),
        null,
        paren(row([slot(1, 'md'), op('·', 3), v('x', 19), op('+', 5), slot(2, 'md')], 1)),
        { symSize: 17 },
      );
    case 'vertex':
      return row([
        v('f', 18), paren(v('x', 17)), op('=', 4),
        slot(0, 'md'), op('·', 2), sup(v('x', 18), rm('2', 13)), op('−', 5), slot(1, 'md'), op('·', 2), v('x', 18),
        op('→', 7), sub(v('x', 18), rm('min', 11)),
      ], 1);
    case 'sum-k':
      return stackOp(
        rm('∑', 22),
        row([v('k', 12), op('=', 1, 12), rm('1', 12)], 0),
        slot(0, 'sm'),
        row([slot(1, 'md'), op('·', 3), v('k', 19)], 1),
        { symSize: 22 },
      );
    case 'mean-3':
      return row([rm('mean', 17), paren(row([slot(0, 'md'), rm(',', 18), sp(3), slot(1, 'md'), rm(',', 18), sp(3), slot(2, 'md')], 1))], 2);
    case 'median-3':
      return row([rm('median', 17), paren(row([slot(0, 'md'), rm(',', 18), sp(3), slot(1, 'md'), rm(',', 18), sp(3), slot(2, 'md')], 1))], 2);
    case 'range-3':
      return row([rm('range', 17), paren(row([slot(0, 'md'), rm(',', 18), sp(3), slot(1, 'md'), rm(',', 18), sp(3), slot(2, 'md')], 1))], 2);
    case 'combinations':
      return row([v('C', 19), paren(row([slot(0, 'md'), rm(',', 18), sp(3), slot(1, 'md')], 1))], 1);
    case 'permutations':
      return frac(row([slot(0, 'sm'), rm('!', 16)], 1), row([slot(1, 'sm'), rm('!', 16)], 1));
    case 'binomial':
      return frac(
        row([v('C', 16), paren(row([slot(0, 'sm'), rm(',', 15), sp(2), slot(1, 'sm')], 1))], 1),
        sup(rm('2', 16), slot(2, 'sm')),
        { padX: 5, gap: 4 },
      );
    case 'conditional':
      return row([
        v('P', 18), paren(row([v('A', 16), op('|', 3, 16), v('B', 16)], 0)), op('=', 5),
        frac(slot(0, 'sm'), slot(1, 'sm')), op('÷', 7), frac(slot(2, 'sm'), slot(3, 'sm')),
      ], 1);
    case 'variance-2':
      return row([sup(v('σ', 19), rm('2', 13)), paren(row([slot(0, 'md'), rm(',', 18), sp(3), slot(1, 'md')], 1))], 2);
    default: {
      // Generic template fallback for any future level
      let k = 0;
      return row(level.template.map((p) => (p === S ? slot(k++, 'md') : rm(p, 17))), 4);
    }
  }
}

// ------------------------------------------------------------------ measurement
// Every node returns { w, asc, desc } where y = 0 is the horizontal math axis (middle of operators/fraction bar).
const SLOT_DIM = {
  md: { w: 34, h: 34, font: 20, smallFont: 16, r: 5 },
  sm: { w: 23, h: 20, font: 14, smallFont: 12, r: 4 },
};

function slotDims(node, st) {
  const base = SLOT_DIM[node.size] ?? SLOT_DIM.md;
  const val = st.values[node.idx];
  const extra = val && val.length > 2 ? (val.length - 2) * 7 : 0;
  return { ...base, w: base.w + extra };
}

function measure(g, node, st) {
  if (node._m) return node._m;
  let m;
  switch (node.type) {
    case 'space':
      m = { w: node.w, asc: 0, desc: 0 };
      break;
    case 'txt': {
      const sz = node.size ?? 18;
      g.font = node.chalk ? chalkNumFont(sz, node.bold ?? true) : mathSerif(sz, { italic: node.italic, bold: node.bold });
      const w = g.measureText(node.text).width + (node.italic ? 1.5 : 0);
      m = { w, asc: sz * 0.48, desc: sz * 0.42 };
      break;
    }
    case 'op': {
      const sz = node.size ?? 19;
      g.font = mathSerif(sz);
      const tw = g.measureText(node.text).width;
      m = { w: tw + node.pad * 2, asc: sz * 0.44, desc: sz * 0.44, tw };
      break;
    }
    case 'slot': {
      const d = slotDims(node, st);
      m = { w: d.w, asc: d.h / 2, desc: d.h / 2, d };
      break;
    }
    case 'row': {
      let w = 0, asc = 0, desc = 0;
      const ms = node.items.map((it) => measure(g, it, st));
      ms.forEach((im, i) => {
        w += im.w + (i > 0 ? node.gap : 0);
        if (im.asc > asc) asc = im.asc;
        if (im.desc > desc) desc = im.desc;
      });
      m = { w, asc, desc, ms };
      break;
    }
    case 'paren': {
      const inner = measure(g, node.inner, st);
      const padV = 2;
      const asc = Math.max(12, inner.asc + padV);
      const desc = Math.max(12, inner.desc + padV);
      const h = asc + desc;
      const pw = Math.max(6.5, Math.min(11, h * 0.19));
      m = { w: pw * 2 + inner.w + 4, asc, desc, inner, pw };
      break;
    }
    case 'frac': {
      const nm = measure(g, node.num, st);
      const dm = measure(g, node.den, st);
      const barW = Math.max(nm.w, dm.w) + node.padX * 2;
      const asc = node.gap + nm.asc + nm.desc;
      const desc = node.gap + dm.asc + dm.desc;
      m = { w: barW + 2, asc, desc, nm, dm, barW };
      break;
    }
    case 'sup': {
      const bm = measure(g, node.base, st);
      const em = measure(g, node.exp, st);
      // Raise exponent above the upper third of the base without floating disconnected
      const lift = Math.max(bm.asc * 0.62, em.desc + 3);
      const asc = Math.max(bm.asc, lift + em.asc);
      const desc = Math.max(bm.desc, em.desc - lift);
      m = { w: bm.w + em.w + 1.5, asc, desc, bm, em, lift };
      break;
    }
    case 'sub': {
      const bm = measure(g, node.base, st);
      const sm = measure(g, node.subNode, st);
      const drop = Math.max(bm.desc * 0.65, sm.asc + 2);
      const asc = Math.max(bm.asc, sm.asc - drop);
      const desc = Math.max(bm.desc, drop + sm.desc);
      m = { w: bm.w + sm.w + 1.5, asc, desc, bm, sm, drop };
      break;
    }
    case 'sqrt': {
      const im = measure(g, node.inner, st);
      const hookW = 14;
      const topGap = 5;
      const asc = im.asc + topGap;
      const desc = im.desc + 1;
      m = { w: hookW + im.w + 4, asc, desc, im, hookW, topGap };
      break;
    }
    case 'evalBar': {
      const em = measure(g, node.expr, st);
      const am = measure(g, node.at, st);
      const barAsc = Math.max(15, em.asc + 2);
      const atDrop = Math.max(em.desc + 2, 11);
      const barDesc = Math.max(15, em.desc + 3, atDrop + am.desc - 1);
      const asc = Math.max(barAsc, am.asc - atDrop);
      const desc = Math.max(barDesc, atDrop + am.desc);
      m = { w: em.w + 7 + am.w, asc, desc, em, am, barAsc, barDesc, atDrop };
      break;
    }
    case 'integral': {
      const lm = measure(g, node.low, st);
      const hm = measure(g, node.high, st);
      const bm = measure(g, node.body, st);
      const symW = 15;
      const limW = Math.max(lm.w, hm.w);
      const intAsc = Math.max(23, hm.asc + hm.desc + 4);
      const intDesc = Math.max(23, lm.asc + lm.desc + 4);
      g.font = mathSerif(18, { italic: true });
      const diffW = g.measureText(node.diff).width + 6;
      m = {
        w: symW + limW + 6 + bm.w + diffW,
        asc: Math.max(intAsc, bm.asc),
        desc: Math.max(intDesc, bm.desc),
        lm, hm, bm, symW, limW, intAsc, intDesc, diffW,
      };
      break;
    }
    case 'stackOp': {
      const sm = measure(g, node.sym, st);
      const um = node.under ? measure(g, node.under, st) : null;
      const om = node.over ? measure(g, node.over, st) : null;
      const bm = measure(g, node.body, st);
      const colW = Math.max(sm.w, um ? um.w : 0, om ? om.w : 0);
      const topH = om ? om.asc + om.desc + 2 : 0;
      const botH = um ? um.asc + um.desc + 2 : 0;
      const asc = Math.max(sm.asc + topH, bm.asc);
      const desc = Math.max(sm.desc + botH, bm.desc);
      m = { w: colW + 6 + bm.w, asc, desc, sm, um, om, bm, colW };
      break;
    }
    default:
      m = { w: 0, asc: 0, desc: 0 };
  }
  node._m = m;
  return m;
}

// ------------------------------------------------------------------ drawing
function drawCurvedParen(g, x, yTop, yBot, pw, side, color) {
  const h = yBot - yTop;
  const cx = side === 'L' ? x + pw : x;
  const bend = side === 'L' ? x + 1.5 : x + pw - 1.5;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = Math.max(1.5, Math.min(2.1, h * 0.045));
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx, yTop + 1);
  g.bezierCurveTo(bend, yTop + h * 0.25, bend, yBot - h * 0.25, cx, yBot - 1);
  g.stroke();
  g.restore();
}

function drawIntegralSign(g, x, yTop, yBot, color) {
  const h = yBot - yTop;
  const mid = (yTop + yBot) / 2;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = 2.2;
  g.lineCap = 'round';
  g.beginPath();
  // Graceful S-curve integral from bottom-left hook to top-right hook
  g.moveTo(x + 1.5, yBot - 2);
  g.bezierCurveTo(x + 5.5, yBot + 1, x + 6.5, mid + h * 0.18, x + 7.5, mid);
  g.bezierCurveTo(x + 8.5, mid - h * 0.18, x + 9.5, yTop - 1, x + 13.5, yTop + 2);
  g.stroke();
  // Tiny calligraphic terminal bulbs
  g.fillStyle = color;
  g.beginPath();
  g.arc(x + 1.5, yBot - 2.5, 1.4, 0, Math.PI * 2);
  g.arc(x + 13.5, yTop + 2.5, 1.4, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawNode(g, node, x, yAxis, st) {
  const m = node._m;
  const ink = st.color;
  switch (node.type) {
    case 'space':
      return;
    case 'txt': {
      const sz = node.size ?? 18;
      g.font = node.chalk ? chalkNumFont(sz, node.bold ?? true) : mathSerif(sz, { italic: node.italic, bold: node.bold });
      g.fillStyle = node.color ?? ink;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(node.text, x, yAxis + 0.5);
      return;
    }
    case 'op': {
      const sz = node.size ?? 19;
      g.font = mathSerif(sz);
      g.fillStyle = ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(node.text, x + m.w / 2, yAxis + 0.5);
      g.textAlign = 'left';
      return;
    }
    case 'slot': {
      const d = m.d;
      const val = st.values[node.idx];
      const filled = val !== undefined && val !== null;
      const isBad = st.badIndex === node.idx;
      const isNext = !filled && st.activeIndex === node.idx && st.highlightActive;
      const sx = x, sy = yAxis - d.h / 2;

      g.save();
      // Subtle recessed slate fill
      g.fillStyle = isBad
        ? 'rgba(130,38,34,0.38)'
        : isNext
          ? 'rgba(255,214,120,0.12)'
          : filled
            ? 'rgba(244,239,230,0.08)'
            : 'rgba(10,16,14,0.45)';
      g.beginPath();
      g.roundRect(sx, sy, d.w, d.h, d.r);
      g.fill();

      const borderCol = isBad ? C.red : isNext ? C.gold : filled ? C.chalk : C.chalkDim;
      g.strokeStyle = borderCol;
      g.lineWidth = isNext || isBad ? 1.8 : 1.35;
      if (!filled && !isNext) g.setLineDash([3, 2.5]);
      g.stroke();
      g.setLineDash([]);

      if (filled) {
        g.font = chalkNumFont(val.length > 1 ? d.smallFont : d.font, true);
        g.fillStyle = isBad ? C.red : C.chalk;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(val, sx + d.w / 2, yAxis + 1);
      } else if (isNext && st.t !== undefined) {
        // Gentle pulsing dot inside the next slot to fill
        const pulse = 0.35 + 0.35 * Math.sin(st.t * 4.5);
        g.fillStyle = `rgba(255,214,120,${pulse})`;
        g.beginPath();
        g.arc(sx + d.w / 2, yAxis, node.size === 'sm' ? 2 : 2.6, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      return;
    }
    case 'row': {
      let cx = x;
      node.items.forEach((it, i) => {
        drawNode(g, it, cx, yAxis, st);
        cx += m.ms[i].w + node.gap;
      });
      return;
    }
    case 'paren': {
      const yTop = yAxis - m.asc;
      const yBot = yAxis + m.desc;
      drawCurvedParen(g, x, yTop, yBot, m.pw, 'L', ink);
      drawNode(g, node.inner, x + m.pw + 2, yAxis, st);
      drawCurvedParen(g, x + m.pw + 4 + m.inner.w, yTop, yBot, m.pw, 'R', ink);
      return;
    }
    case 'frac': {
      const { nm, dm, barW } = m;
      const numY = yAxis - node.gap - nm.desc;
      const denY = yAxis + node.gap + dm.asc;
      drawNode(g, node.num, x + 1 + (barW - nm.w) / 2, numY, st);
      g.save();
      g.strokeStyle = ink;
      g.lineWidth = 1.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + 1, yAxis);
      g.lineTo(x + 1 + barW, yAxis);
      g.stroke();
      g.restore();
      drawNode(g, node.den, x + 1 + (barW - dm.w) / 2, denY, st);
      return;
    }
    case 'sup': {
      drawNode(g, node.base, x, yAxis, st);
      drawNode(g, node.exp, x + m.bm.w + 1.5, yAxis - m.lift, st);
      return;
    }
    case 'sub': {
      drawNode(g, node.base, x, yAxis, st);
      drawNode(g, node.subNode, x + m.bm.w + 1.5, yAxis + m.drop, st);
      return;
    }
    case 'sqrt': {
      const { im, hookW, topGap } = m;
      const yTop = yAxis - im.asc - topGap + 1;
      const yBot = yAxis + im.desc;
      const yMid = yAxis + im.desc * 0.15;
      g.save();
      g.strokeStyle = ink;
      g.lineWidth = 1.8;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x + 1, yMid);
      g.lineTo(x + 4, yMid - 2);
      g.lineTo(x + 7.5, yBot - 1);
      g.lineTo(x + hookW - 1, yTop);
      g.lineTo(x + hookW + im.w + 3, yTop);
      g.stroke();
      g.restore();
      drawNode(g, node.inner, x + hookW + 1, yAxis, st);
      return;
    }
    case 'evalBar': {
      const { em, barAsc, barDesc, atDrop } = m;
      drawNode(g, node.expr, x, yAxis, st);
      const bx = x + em.w + 3;
      g.save();
      g.strokeStyle = ink;
      g.lineWidth = 1.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bx, yAxis - barAsc);
      g.lineTo(bx, yAxis + barDesc);
      g.stroke();
      g.restore();
      drawNode(g, node.at, bx + 4, yAxis + atDrop, st);
      return;
    }
    case 'integral': {
      const { lm, hm, bm, symW, limW, intAsc, intDesc } = m;
      drawIntegralSign(g, x, yAxis - intAsc + 2, yAxis + intDesc - 2, ink);
      // Upper limit tucked near top-right hook, lower limit near bottom-right
      drawNode(g, node.high, x + symW + 1, yAxis - intAsc + hm.asc + 1, st);
      drawNode(g, node.low, x + symW - 2, yAxis + intDesc - lm.desc - 1, st);
      const bodyX = x + symW + limW + 5;
      drawNode(g, node.body, bodyX, yAxis, st);
      g.font = mathSerif(18, { italic: true });
      g.fillStyle = ink;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(node.diff, bodyX + bm.w + 4, yAxis + 0.5);
      return;
    }
    case 'stackOp': {
      const { sm, um, om, colW } = m;
      drawNode(g, node.sym, x + (colW - sm.w) / 2, yAxis, st);
      if (om) drawNode(g, node.over, x + (colW - om.w) / 2, yAxis - sm.asc - 2 - om.desc, st);
      if (um) drawNode(g, node.under, x + (colW - um.w) / 2, yAxis + sm.desc + 2 + um.asc, st);
      drawNode(g, node.body, x + colW + 6, yAxis, st);
      return;
    }
  }
}

/**
 * Measure a level's typeset math expression (without drawing) so callers can size enclosing plaques accurately.
 */
export function measureMathExpression(g, level, opts = {}) {
  const {
    values = [], suffix = null, suffixColor = C.chalk,
    maxWidth = Infinity, maxHeight = Infinity, baseScale = 1,
    compactArith = false, color = C.chalk,
  } = opts;
  let tree = levelMathTree(level, { compactArith, filledCount: values.length });
  if (suffix) {
    tree = row([tree, sp(7), txt(suffix, { chalk: true, bold: true, size: 19, color: suffixColor })], 2);
  }
  const st = { values, badIndex: -1, activeIndex: -1, highlightActive: false, color, t: 0 };
  g.save();
  const m = measure(g, tree, st);
  g.restore();
  const rawH = Math.max(1, m.asc + m.desc);
  let scale = baseScale;
  if (m.w * scale > maxWidth) scale = maxWidth / m.w;
  if (rawH * scale > maxHeight) scale = Math.min(scale, maxHeight / rawH);
  return { w: m.w * scale, h: rawH * scale, scale, m };
}

/**
 * Measure and draw a level's typeset math formula centered vertically on `yAxis`.
 * Automatically scales down cleanly if wider than `maxWidth` or taller than `maxHeight`.
 * Returns `{ w, h, scale }` of the drawn expression.
 */
export function drawMathExpression(g, level, {
  x = 0, yAxis = 0, align = 'left',
  values = [], badIndex = -1, activeIndex = -1, highlightActive = false,
  suffix = null, suffixColor = C.chalk,
  maxWidth = Infinity, maxHeight = Infinity,
  baseScale = 1, color = C.chalk, t = 0, compactArith = false,
} = {}) {
  let tree = levelMathTree(level, { compactArith, filledCount: values.length });
  if (suffix) {
    tree = row([tree, sp(7), txt(suffix, { chalk: true, bold: true, size: 19, color: suffixColor })], 2);
  }
  const st = { values, badIndex, activeIndex, highlightActive, color, t };
  g.save();
  const m = measure(g, tree, st);
  const rawH = Math.max(1, m.asc + m.desc);
  let scale = baseScale;
  if (m.w * scale > maxWidth) scale = maxWidth / m.w;
  if (rawH * scale > maxHeight) scale = Math.min(scale, maxHeight / rawH);

  const drawW = m.w * scale;
  const drawH = rawH * scale;
  const startX = align === 'center' ? x - drawW / 2 : align === 'right' ? x - drawW : x;
  // Center the vertical bounding box around yAxis so tall fractions/integrals sit balanced in the tray
  const axisOffset = ((m.asc - m.desc) / 2) * scale;
  g.translate(startX, yAxis + axisOffset);
  g.scale(scale, scale);
  drawNode(g, tree, 0, 0, st);
  g.restore();
  return { w: drawW, h: drawH, scale };
}
