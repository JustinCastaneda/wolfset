import { requireNativeModule, NativeModule } from 'expo-modules-core';

export type HrSampleEvent = {
  seq: number;
  bpm: number;
  acc: string;
  watchWallMs: number;
  watchBattery: number;
  phoneRecvMs: number;
  clockOffsetMs: number;
  bridgeSendMs: number;
  /** 1 = watch was in ambient (blurred) mode when sampled; 0 = interactive; -1 = unknown. */
  amb: number;
};

export type TimerEvent = {
  state: 'idle' | 'running' | 'done';
  remainingMs: number;
  durationMs: number;
};

export type GateEvent = {
  recovered: boolean;
  bpm: number;
  peakBpm: number;
  thresholdBpm: number;
};

export type LinkEvent = {
  event: 'pong' | 'note';
  rttMs?: number;
  offsetMs?: number;
  note?: string;
};

export type Metrics = {
  clockOffsetMs: number;
  lastRttMs: number;
  peakBpm: number;
  lastBpm: number;
  recovered: boolean;
  phoneBattery: number;
  nativeSampleCount: number;
};

type SpikeHrEvents = {
  onHrSample: (event: HrSampleEvent) => void;
  onTimer: (event: TimerEvent) => void;
  onGate: (event: GateEvent) => void;
  onLink: (event: LinkEvent) => void;
};

declare class SpikeHrNativeModule extends NativeModule<SpikeHrEvents> {
  startSession(): void;
  stopSession(): void;
  startTimer(durationSeconds: number): void;
  stopTimer(): void;
  getMetrics(): Metrics;
  getSessionLogJson(): string;
}

export default requireNativeModule<SpikeHrNativeModule>('SpikeHr');
