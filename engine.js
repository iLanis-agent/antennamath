/* AntennaMath engine - ham antenna math. Pure functions, no DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AntennaMath = api;
}(typeof self !== 'undefined' ? self : this, function () {

  function r2(x) { return Math.round(x * 100) / 100; }

  // Wavelength in meters.
  function wavelengthM(fMHz) {
    if (fMHz <= 0) return 0;
    return r2(300 / fMHz);
  }

  // Half-wave dipole total length (ft): 468/f, with the built-in ~5% end
  // effect for bare wire. Cut long, trim by SWR.
  function dipoleFt(fMHz) {
    if (fMHz <= 0) return 0;
    return r2(468 / fMHz);
  }

  function dipoleLegFt(fMHz) {
    return r2(dipoleFt(fMHz) / 2);
  }

  // Quarter-wave vertical (ft): 234/f.
  function verticalFt(fMHz) {
    if (fMHz <= 0) return 0;
    return r2(234 / fMHz);
  }

  // SWR from wattmeter readings.
  function gamma(fwdW, reflW) {
    if (fwdW <= 0 || reflW < 0 || reflW > fwdW) return null;
    return r2(Math.sqrt(reflW / fwdW) * 100) / 100;
  }

  function swr(fwdW, reflW) {
    var g = gamma(fwdW, reflW);
    if (g == null || g >= 1) return g === 1 ? Infinity : null;
    return r2((1 + g) / (1 - g));
  }

  // Power bounced back by the mismatch, as a percent of forward power.
  function mismatchPct(fwdW, reflW) {
    var g = gamma(fwdW, reflW);
    if (g == null) return null;
    return r2(g * g * 100);
  }

  function swrVerdict(s) {
    if (s == null) return { level: 'bad', text: 'Reflected power cannot exceed forward power - check the meter.' };
    if (s === Infinity || s > 3) return { level: 'bad', text: 'SWR ' + (s === Infinity ? 'infinite' : s) + ' - the rig is folding back power and the final transistors are sweating. Do not transmit.' };
    if (s > 2) return { level: 'warn', text: 'SWR ' + s + ' - usable in a pinch, but the antenna wants a tuner or a trim.' };
    if (s > 1.5) return { level: 'warn', text: 'SWR ' + s + ' - fine for everyday work, perfectionists trim the legs.' };
    return { level: 'good', text: 'SWR ' + s + ' - a happy antenna.' };
  }

  // Coax loss, dB per 100 ft at the nearest catalog frequency.
  var COAX = {
    'RG-58':   { 10: 1.3, 146: 4.5, 440: 8.5 },
    'RG-8X':   { 10: 1.0, 146: 3.3, 440: 6.0 },
    'RG-213':  { 10: 0.75, 146: 2.3, 440: 4.2 },
    'LMR-400': { 10: 0.4, 146: 1.4, 440: 2.6 }
  };

  function coaxDb100(type, fMHz) {
    var c = COAX[type];
    if (!c) return null;
    var bands = Object.keys(c).map(Number).sort(function (a, b) { return a - b; });
    var best = bands[0];
    bands.forEach(function (b) { if (Math.abs(b - fMHz) < Math.abs(best - fMHz)) best = b; });
    return c[best];
  }

  function coaxLossDb(type, fMHz, lenFt) {
    var per = coaxDb100(type, fMHz);
    if (per == null) return null;
    return r2(per * lenFt / 100);
  }

  // Watts that survive the coax.
  function deliveredW(txW, lossDb) {
    return r2(txW * Math.pow(10, -lossDb / 10));
  }

  // ERP: delivered watts with antenna gain over a dipole (dBd).
  function erpW(txW, lossDb, gainDbd) {
    return r2(deliveredW(txW, lossDb) * Math.pow(10, (gainDbd || 0) / 10));
  }

  function coaxVerdict(lossDb, delivered, txW) {
    if (lossDb == null) return { level: 'bad', text: 'Unknown coax type.' };
    if (lossDb >= 3) return { level: 'bad', text: lossDb + ' dB of coax loss - more than half the power heats the cable. ' + delivered + ' of ' + txW + ' W reaches the antenna.' };
    if (lossDb >= 1) return { level: 'warn', text: lossDb + ' dB of coax loss - ' + delivered + ' of ' + txW + ' W reaches the antenna.' };
    return { level: 'good', text: lossDb + ' dB of coax loss - ' + delivered + ' of ' + txW + ' W reaches the antenna.' };
  }

  function compute(input) {
    var f = +input.fMHz;
    if (!(f > 0)) return { error: 'Frequency must be a positive number of MHz.' };
    var res = {
      fMHz: f,
      wavelengthM: wavelengthM(f),
      dipoleFt: dipoleFt(f),
      dipoleLegFt: dipoleLegFt(f),
      verticalFt: verticalFt(f)
    };
    if (input.fwdW != null && input.fwdW !== '') {
      res.swr = swr(+input.fwdW, +(input.reflW || 0));
      res.mismatchPct = mismatchPct(+input.fwdW, +(input.reflW || 0));
      res.swrCheck = swrVerdict(res.swr);
    }
    if (input.txW != null && input.txW !== '' && input.lenFt != null && input.lenFt !== '' && input.coax) {
      res.lossDb = coaxLossDb(input.coax, f, +input.lenFt);
      res.deliveredW = deliveredW(+input.txW, res.lossDb);
      res.erpW = erpW(+input.txW, res.lossDb, +(input.gainDbd || 2.15));
      res.coaxCheck = coaxVerdict(res.lossDb, res.deliveredW, +input.txW);
      res.alternatives = Object.keys(COAX).map(function (t) {
        var db = coaxLossDb(t, f, +input.lenFt);
        return { type: t, lossDb: db, deliveredW: deliveredW(+input.txW, db) };
      }).sort(function (a, b) { return b.deliveredW - a.deliveredW; });
    }
    return res;
  }

  return {
    COAX: COAX, wavelengthM: wavelengthM, dipoleFt: dipoleFt, dipoleLegFt: dipoleLegFt,
    verticalFt: verticalFt, gamma: gamma, swr: swr, mismatchPct: mismatchPct,
    swrVerdict: swrVerdict, coaxDb100: coaxDb100, coaxLossDb: coaxLossDb,
    deliveredW: deliveredW, erpW: erpW, coaxVerdict: coaxVerdict, compute: compute
  };
}));
