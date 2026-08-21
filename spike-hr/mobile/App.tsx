import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import SpikeHr, {
  GateEvent,
  HrSampleEvent,
  LinkEvent,
  TimerEvent,
} from './modules/spike-hr';
import { MetricsCollector, Percentiles } from './src/metrics';

// Throwaway spike UI. Deliberately ugly — its only job is to render live BPM, run the
// gated rest timer, and put honest numbers on the pipe. Do not reuse in mobile/.

type PendingSample = { sample: HrSampleEvent; jsRecvMs: number };

export default function App() {
  const metrics = useRef(new MetricsCollector()).current;

  // Samples queue in a ref, NOT state: the watch delivers in bursts (39 samples in 1.9s
  // observed after a link stall), and React 18 batches a burst into one commit. A single
  // pending-sample state slot keeps only the last sample per commit — session 1 recorded
  // 51 of 145 samples and fabricated 93 "drops" that never happened at the bridge.
  const pendingQueue = useRef<PendingSample[]>([]);
  const [sampleTick, setSampleTick] = useState(0);
  const [lastSampleAtMs, setLastSampleAtMs] = useState<number | null>(null);

  const [sessionOn, setSessionOn] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [gate, setGate] = useState<GateEvent | null>(null);
  const [timer, setTimer] = useState<TimerEvent>({ state: 'idle', remainingMs: 0, durationMs: 0 });
  const [link, setLink] = useState<LinkEvent | null>(null);
  const [statsTick, setStatsTick] = useState(0);
  const [timerDriftMs, setTimerDriftMs] = useState<number | null>(null);
  const timerExpectedEnd = useRef<number | null>(null);

  useEffect(() => {
    const subs = [
      SpikeHr.addListener('onHrSample', (sample: HrSampleEvent) => {
        const jsRecvMs = Date.now();
        pendingQueue.current.push({ sample, jsRecvMs });
        setBpm(sample.bpm);
        setLastSampleAtMs(jsRecvMs);
        // Tick guarantees a commit even when bpm is unchanged between samples.
        setSampleTick((n) => n + 1);
      }),
      SpikeHr.addListener('onGate', setGate),
      SpikeHr.addListener('onTimer', (t: TimerEvent) => {
        setTimer(t);
        if (t.state === 'done' && timerExpectedEnd.current !== null) {
          setTimerDriftMs(Date.now() - timerExpectedEnd.current);
          timerExpectedEnd.current = null;
        }
      }),
      SpikeHr.addListener('onLink', setLink),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  // Post-commit: drain everything that arrived before this commit. All drained samples share
  // one renderMs — honest, because this commit is the first paint any of them reached. Only
  // the last of a burst is actually visible, but "reached the screen" is what e2e measures.
  useEffect(() => {
    if (pendingQueue.current.length === 0) return;
    const renderMs = Date.now();
    const drained = pendingQueue.current;
    pendingQueue.current = [];
    for (const { sample, jsRecvMs } of drained) metrics.record(sample, jsRecvMs, renderMs);
    setStatsTick((n) => n + 1);
  }, [sampleTick]);

  // 1 Hz repaint so signal age stays current while the pipe is silent — a stalled link
  // otherwise looks identical to a healthy one showing its last value (session 1: 72s stall
  // froze the display at peak BPM with no visible difference from live data).
  useEffect(() => {
    const id = setInterval(() => setStatsTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleSession = () => {
    if (sessionOn) {
      SpikeHr.stopSession();
      setSessionOn(false);
    } else {
      metrics.start(SpikeHr.getMetrics().phoneBattery);
      SpikeHr.startSession();
      setSessionOn(true);
      setTimerDriftMs(null);
    }
  };

  const startTimer = (seconds: number) => {
    timerExpectedEnd.current = Date.now() + seconds * 1000;
    SpikeHr.startTimer(seconds);
  };

  const exportSession = async () => {
    const json = metrics.exportJson(SpikeHr.getMetrics(), SpikeHr.getSessionLogJson());
    const file = new File(Paths.cache, `wolfset-spike-${Date.now()}.json`);
    file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
  };

  const stats = metrics.stats();
  const recovered = gate?.recovered ?? true;

  // Stale = no sample for 3× the watch's observed 1.92s cadence. Session 1's 72s transport
  // stall proved the pipe can go quiet while the watch keeps sampling; the product gate must
  // treat a quiet pipe as "unknown", never as "still at the last value".
  const signalAgeMs = lastSampleAtMs === null ? null : Date.now() - lastSampleAtMs;
  const signalStale = signalAgeMs !== null && signalAgeMs > 6000;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>WOLFSET · HR spike</Text>

        <Text style={[styles.bpm, signalStale && { color: '#6d7077' }]}>
          {bpm !== null ? Math.round(bpm) : '--'}
        </Text>
        <Text style={[styles.bpmLabel, signalStale && { color: '#f04245' }]}>
          {signalAgeMs === null
            ? 'bpm from watch'
            : signalStale
              ? `SIGNAL STALE — last sample ${Math.round(signalAgeMs / 1000)}s ago`
              : `bpm from watch · ${(signalAgeMs / 1000).toFixed(1)}s ago`}
        </Text>

        <View style={[styles.gate, { backgroundColor: recovered ? '#1d4a2a' : '#5c1f21' }]}>
          <Text style={styles.gateText}>
            {gate === null
              ? 'GATE: waiting for samples'
              : recovered
                ? `RECOVERED — next set unlocked (≤ ${Math.round(gate.thresholdBpm)} bpm)`
                : `RESTING — ${Math.round(gate.bpm)} bpm, unlocks at ${Math.round(gate.thresholdBpm)}`}
          </Text>
          <Text style={styles.gateSub}>placeholder rule: 65% of peak, floor 110 — NOT the product rule</Text>
        </View>

        <View style={styles.timerRow}>
          <Text style={styles.timerText}>
            {timer.state === 'running' ? formatMs(timer.remainingMs) : timer.state === 'done' ? '0:00 ✓' : '–:––'}
          </Text>
          {timerDriftMs !== null && (
            <Text style={styles.mono}>done drift: {timerDriftMs} ms</Text>
          )}
        </View>
        <View style={styles.buttonRow}>
          {[30, 90, 180].map((s) => (
            <Btn key={s} label={formatMs(s * 1000)} onPress={() => startTimer(s)} disabled={!sessionOn} />
          ))}
          <Btn label="stop" onPress={() => SpikeHr.stopTimer()} disabled={!sessionOn} />
        </View>

        <View style={styles.buttonRow}>
          <Btn
            label={sessionOn ? 'End session' : 'Start session'}
            onPress={toggleSession}
            emphasis
          />
          <Btn label="Export JSON" onPress={exportSession} disabled={stats.jsSamplesSeen === 0} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Pipe metrics (exit criteria A)</Text>
          <Row k="samples (JS / native)" v={`${stats.jsSamplesSeen} / ${SpikeHr.getMetrics?.().nativeSampleCount ?? '?'}`} />
          <Row k="dropped (seq gaps @ JS)" v={`${stats.droppedSeqGaps}`} />
          <PercRow k="beat → render (e2e)" p={stats.e2e} warnOverMs={2000} />
          <PercRow k="watch → phone" p={stats.watchToPhone} />
          <PercRow k="bridge → JS" p={stats.nativeToJs} />
          <Row
            k="clock offset / RTT"
            v={link?.event === 'pong' ? `${link.offsetMs} ms / ${link.rttMs} ms` : 'awaiting pong'}
          />
          <Row
            k="watch battery"
            v={
              stats.watchBatteryFirst !== null
                ? `${stats.watchBatteryFirst}% → ${stats.watchBatteryLast}%`
                : '—'
            }
          />
          <Row k="phone battery @ start" v={stats.phoneBatteryFirst !== null ? `${stats.phoneBatteryFirst}%` : '—'} />
          {link?.event === 'note' && <Row k="link note" v={link.note ?? ''} />}
        </View>
        <Text style={styles.footnote} key={statsTick}>
          Leave the screen off and the phone in a pocket for the real test — this screen is for
          before/after reads. Export JSON at session end and file it in docs/spike-findings.md.
        </Text>
      </ScrollView>
    </View>
  );
}

function Btn({
  label,
  onPress,
  disabled,
  emphasis,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  emphasis?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        emphasis && styles.btnEmphasis,
        (disabled || pressed) && { opacity: 0.5 },
      ]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={styles.mono}>{v}</Text>
    </View>
  );
}

function PercRow({ k, p, warnOverMs }: { k: string; p: Percentiles; warnOverMs?: number }) {
  const warn = warnOverMs !== undefined && p.n > 0 && p.p95 > warnOverMs;
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={[styles.mono, warn && { color: '#f04245' }]}>
        {p.n === 0 ? '—' : `avg ${p.avg} · p95 ${p.p95} · max ${p.max} ms`}
      </Text>
    </View>
  );
}

function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111214' },
  scroll: { padding: 16, paddingTop: 64, alignItems: 'stretch' },
  title: { color: '#f04245', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  bpm: { color: '#fff', fontSize: 96, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  bpmLabel: { color: '#9a9da3', textAlign: 'center', marginBottom: 16 },
  gate: { borderRadius: 12, padding: 12, marginBottom: 16 },
  gateText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  gateSub: { color: '#c9ccd1', fontSize: 10, textAlign: 'center', marginTop: 4 },
  timerRow: { alignItems: 'center', marginBottom: 8 },
  timerText: { color: '#fff', fontSize: 48, fontVariant: ['tabular-nums'] },
  buttonRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12 },
  btn: { backgroundColor: '#2a2c30', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, minWidth: 64, alignItems: 'center' },
  btnEmphasis: { backgroundColor: '#f04245' },
  btnText: { color: '#fff', fontWeight: '600' },
  panel: { backgroundColor: '#1b1d20', borderRadius: 12, padding: 12, marginTop: 8 },
  panelTitle: { color: '#fff', fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 12 },
  rowKey: { color: '#9a9da3', fontSize: 12, flexShrink: 1 },
  mono: { color: '#e6e8ea', fontSize: 12, fontVariant: ['tabular-nums'] },
  footnote: { color: '#6d7077', fontSize: 11, marginTop: 16, textAlign: 'center' },
});
