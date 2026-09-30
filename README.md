# AntennaMath

Ham antenna math. The dipole constant is 468 and everyone argues it should be
492, the SWR meter says 3:1 like that is fine, and the RG-58 ate half your
watts before they ever saw wire.

## What it does

- **Lengths by frequency**: wavelength, half-wave dipole (total and per leg),
  quarter-wave vertical. 468/f assumes bare wire in free space - cut long,
  trim by SWR, because PVC jacket and rooflines detune everything.
- **SWR from wattmeter readings**: gamma = sqrt(Pr/Pf), SWR = (1+g)/(1-g),
  plus the percent of power the mismatch sends back and a plain verdict
  (happy / trim it / tuner / do not transmit).
- **Coax truth**: dB/100ft by type (RG-58, RG-8X, RG-213, LMR-400) at the
  nearest catalog band, total run loss, watts delivered to the antenna, ERP
  with dipole gain, and every coax type compared for your run.
- The 2-meter lesson built in: 75 ft of RG-58 turns 50 W into 23 W. The fix
  is in the comparison table.

## Quickstart

Static site, no build step. Open `index.html` or serve the folder:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Architecture

| File | Purpose |
| --- | --- |
| `index.html` | Landing page |
| `app.html` | The calculator: lengths, SWR, coax comparison |
| `engine.js` | Pure antenna math, no DOM (shared by app and tests) |
| `test-engine.js` | `node test-engine.js` - 41 assertions |

## The math

- Wavelength: `300 / fMHz` meters.
- Dipole: `468 / fMHz` ft total (end effect included); legs are half.
- Vertical: `234 / fMHz` ft.
- SWR: `g = sqrt(Pr/Pf)`; `SWR = (1+g)/(1-g)`; mismatch % = `g^2 x 100`.
- Coax: `loss = dB/100ft x length/100`; `delivered = tx x 10^(-loss/10)`;
  `ERP = delivered x 10^(gainDbd/10)`.

## References

- ARRL Antenna Book: 468/f dipole constant, velocity factor and end effect.
- Coax catalog loss figures (Times Microwave, Belden) at 10 / 146 / 440 MHz.

## License

MIT
