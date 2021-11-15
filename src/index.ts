/*
 y(t) = A(t) sin(phi + Int{0->t}[2*pi*f(x)dx])
 f(t) = C + M(t)

 A = Amplitude
 C = Carrier / base / fundamental frequency
 M = Modulation signal
*/

const TWOPI = 2 * Math.PI;
const MAXPHASE = 4294967295; // 2**32 - 1 -- all binary 1s

type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

export type FMOutputArray = Writable<ArrayLike<number>>;

function modulate(
  signal: (t: number) => [number, number],
  voice: (t: number) => number,
  sampleRate: number,
  start: number,
  end: number,
  phase: number,
  base: number,
  output: FMOutputArray,
): [ArrayLike<number>, number] {
  phase &= MAXPHASE;
  const sample_phase = MAXPHASE / sampleRate;
  for (let i = start, o = 0; i < end; i++, o++) {
    const [frequency, amplitude] = signal(i);
    phase = (phase + sample_phase * (base + frequency) + 0.5) & MAXPHASE;
    output[o] = amplitude * voice(TWOPI * (phase / MAXPHASE));
  }

  return [output, phase];
}

interface BasicInput {
  phase?: number;
  base?: number;
  start?: number;
  end?: number;
  voice?: (t: number) => number;
  output?: FMOutputArray;
  sampleRate: number;
}

export type FMSynthFreqInput = {
  frequency: ArrayLike<number>;
  amplitude?: number;
} & BasicInput;

export function fromFreq({
  sampleRate, frequency,
  amplitude = 1,
  phase = 0, base = 0, start = 0,
  end = frequency.length,
  output = new Float32Array(end - start),
  voice = Math.sin,
}: FMSynthFreqInput) {
  const pair: [number, number] = [0, amplitude];
  const signal = (t: number) => {
    pair[0] = frequency[t];
    return pair;
  };
  
  return modulate(signal, voice, sampleRate, start, end, phase, base, output);
}

export type FMSynthPairInput = {
  frequency: ArrayLike<number>;
  amplitude: ArrayLike<number>;
} & BasicInput;

export function fromPaired({
  sampleRate, frequency, amplitude,
  phase = 0, base = 0, start = 0,
  end = Math.min(frequency.length, amplitude.length),
  output = new Float32Array(end - start),
  voice = Math.sin,
}: FMSynthPairInput) {
  const pair: [number, number] = [0, 0];
  const signal = (t: number) => {
    pair[0] = frequency[t];
    pair[1] = amplitude[t];
    return pair;
  };
  
  return modulate(signal, voice, sampleRate, start, end, phase, base, output);
}

export type FMSynthInterlacedInput = {
  data: ArrayLike<number>;
} & BasicInput;

export function fromInterlaced({
  sampleRate, data,
  phase = 0, base = 0, start = 0,
  end = data.length,
  voice = Math.sin,
  output = new Float32Array(end - start),
}: FMSynthInterlacedInput) {
  const pair: [number, number] = [0, 0];
  const signal = (t: number) => {
    const i = t<<2;
    pair[0] = data[i];
    pair[1] = data[i+1];
    return pair;
  };
  
  return modulate(signal, voice, sampleRate, start, end, phase, base, output);
}

export type FMSynthFunctionInput = {
  signal(t: number): [frequency: number, amplitude: number];
} & ({
  end: number;
} | {
  output: FMOutputArray;
}) & BasicInput;

export function fromSignalFn({
  signal, sampleRate, end, output,
  voice = Math.sin,
  phase = 0, base = 0, start = 0,
}: FMSynthFunctionInput) {
  if (typeof output !== 'undefined') {
    end = start + output.length;
  } else {
    output = new Float32Array(end as number - start);
  }
  return modulate(signal, voice, sampleRate, start, end as number, phase, base, output);
}