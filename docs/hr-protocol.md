# Watch → phone heart-rate protocol

The watch app (`wear/`) and the phone's native module (`mobile/modules/wolfset-hr`) agree on
this by hand — there is no shared library. Change it in both places and here.

## Routing prerequisites

The Wearable Data Layer only delivers between a watch app and a phone app that share **the
same `applicationId`** (`app.wolfset` on both) **and the same signing certificate**. Debug
builds: `mobile/plugins/withSharedDebugKeystore.js` points the phone app at
`~/.android/debug.keystore`, the keystore the watch build uses by default. Verify before a
hardware session — a mismatch drops every message silently on both sides:

```bash
apksigner verify --print-certs wear/app/build/outputs/apk/debug/app-debug.apk | grep SHA-1
apksigner verify --print-certs mobile/android/app/build/outputs/apk/debug/app-debug.apk | grep SHA-1
```

## Message

`MessageClient` message, path **`/wolfset/hr`**, one per sample, JSON body:

| Field | Type | Meaning |
|---|---|---|
| `seq` | int | Monotonic per watch stream. The phone drops anything ≤ the max already seen (out-of-order delivery was observed in the spike; a stale low BPM after a fresh high one would unlock the gate early). |
| `bpm` | number | Heart rate. |
| `acc` | string | Health Services accuracy: `ACCURACY_HIGH` / `_MEDIUM` / `_LOW` / `UNKNOWN`. |
| `watchWallMs` | int | Sample time on the watch's wall clock (ms). |
| `amb` | 0 / 1 | 1 when the watch was in ambient (blurred) mode. |
| `bm` | 0 / 1 | 1 when the `HEART_RATE_5_SECONDS` batching override is active — without it, delivery stalls in ambient until the wrist is raised. |

The phone stamps `phoneRecvMs` on arrival.

## Expectations on the receiver (from `docs/spike-findings.md`)

1. **Staleness**: no fresh sample for ~6 s (3× the 1.92 s cadence) → the reading is
   *unknown*; show signal-lost; the gate must not change state on it.
2. **Out-of-order**: ignore `seq` ≤ the max seen.
3. **Bursts**: samples arrive in clumps (39 in 1.9 s after a stall); never assume one at a time.

## Timing to expect

Interactive watch ≈ 3.5 s beat-to-render; ambient ≈ 6–8 s (5 s batch floor + transport).

## Watch permissions (learned on hardware, 2026-09-02)

Wear OS 6 (Android 16) moved heart rate under Health Connect. Health Services refuses to
start an exercise without **`android.permission.health.READ_HEART_RATE`** — the error is a
`SecurityException: Missing permissions` in the watch log, and the watch screen says
"Could not start". The watch app declares and requests it alongside `BODY_SENSORS` and
`ACTIVITY_RECOGNITION`; older watches ignore the extra one. The Phase 0 spike predates this
OS update and would fail the same way on a current Pixel Watch 4.
