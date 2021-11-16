/*
 y(t) = A(t) sin(phi + Int{0->t}[2*pi*f(x)dx])
 f(t) = C + M(t)

 A = Amplitude
 C = Carrier / base / fundamental frequency
 M = Modulation signal
*/

const TWOPI = 2 * Math.PI;
const INVTWOPI = 1 / TWOPI;
const TWOOVERPI = 2 / Math.PI;
const MAXPHASE = 4294967295; // 2**32 - 1 -- all binary 1s

type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

export type FMOutputArray = Writable<ArrayLike<number>>;

const voices = {
  sine: Math.sin,
  square: (t: number) => Math.sign(Math.sin(t)),
  triangle: (t: number) => Math.asin(Math.sin(t)) * TWOOVERPI,
  sawtooth(t: number) {
    const x = t * INVTWOPI;
    return 2 * (x - Math.floor(x)) - 1;
  },
};

type Voices = keyof typeof voices;

interface BasicInput {
  phase?: number;
  base?: number;
  start?: number;
  end?: number;
  offset?: number,
  voice?: ((t: number) => number) | Voices;
  output?: FMOutputArray;
  sampleRate: number;
}

function modulate(
  signal: Iterable<[number, number]>,
  output: FMOutputArray,
  offset: number,
  len: number,
  {
    sampleRate,
    phase = 0,
    base = 0,
    voice = Math.sin,
  }: BasicInput,
): [ArrayLike<number>, number] {
  if (typeof voice === 'string') {
    voice = voices[voice];
  }
  phase &= MAXPHASE;
  const sample_phase = MAXPHASE / sampleRate;
  for (const [frequency, amplitude] of signal) {
    if (offset >= len) break;
    phase = (phase + sample_phase * (base + frequency) + 0.5) & MAXPHASE;
    output[offset++] = amplitude * voice(TWOPI * (phase / MAXPHASE));
  }

  return [output, phase];
}

export type FMSynthFreqInput = {
  frequency: ArrayLike<number>;
  amplitude?: number;
} & BasicInput;


function * freqSignal(start: number, end: number, amplitude: number, frequency: ArrayLike<number>) {
  const pair: [number, number] = [0, amplitude];
  for (let i = start; i < end; i++) {
    pair[0] = frequency[i];
    yield pair;
  }
}

export function fromFreq(input: FMSynthFreqInput) {
  const {
    frequency,
    amplitude = 1,
    start = 0,
    offset = 0,
    end = frequency.length,
    output = new Float32Array(offset + end - start),
  } = input;
  
  return modulate(freqSignal(start, end, amplitude, frequency), output, offset, output.length, input);
}

export type FMSynthPairInput = {
  frequency: ArrayLike<number>;
  amplitude: ArrayLike<number>;
} & BasicInput;

function * pairedSignal(start: number, end: number, amplitude: ArrayLike<number>, frequency: ArrayLike<number>) {
  const pair: [number, number] = [0, 0];
  for (let i = start; i < end; i++) {
    pair[0] = frequency[i];
    pair[1] = amplitude[i];
    yield pair;
  }
}

export function fromPaired(input: FMSynthPairInput) {
  const {
    frequency, amplitude,
    start = 0,
    offset = 0,
    end = Math.min(frequency.length, amplitude.length),
    output = new Float32Array(offset + end - start),
  } = input;
  
  return modulate(pairedSignal(start, end, amplitude, frequency), output, offset, output.length, input);
}

export type FMSynthInterlacedInput = {
  data: ArrayLike<number>;
} & BasicInput;

function * interlacedSignal(start: number, end: number, data: ArrayLike<number>) {
  const pair: [number, number] = [0, 0];
  for (let i = start; i < end;) {
    pair[0] = data[i++];
    pair[1] = data[i++];
    yield pair;
  }
}

export function fromInterlaced(input: FMSynthInterlacedInput) {
  const {
    data,
    start = 0,
    offset = 0,
    end = data.length,
    output = new Float32Array(offset + Math.floor((end - start)/2)),
  } = input;
  
  return modulate(interlacedSignal(start, end, data), output, offset, output.length, input);
}

export type FMSynthFunctionInput = {
  signal(t: number): [frequency: number, amplitude: number];
} & ({
  end: number;
  output?: FMOutputArray;
} | {
  output: FMOutputArray;
  end?: number;
}) & BasicInput;

function * fnSignal(start: number, end: number, fn: (t: number) => [number, number]) {
  for (let i = start; i < end; i++) {
    yield fn(i);
  }
}

export function fromSignalFn(input: FMSynthFunctionInput) {
  let { signal, end, output, start = 0, offset = 0 } = input;
  if (typeof output !== 'undefined') {
    end = start + output.length - offset;
  } else {
    output = new Float32Array(offset + (end as number) - start);
  }
  return modulate(fnSignal(start, end as number, signal), output, offset, output.length, input);
}

export type FMSynthIterableInput = {
  signal: Iterable<[frequency: number, amplitude: number]>;
} & ({
  len: number;
  output?: FMOutputArray;
} | {
  output: FMOutputArray;
  len?: number
}) & BasicInput;

export function fromIterable(input: FMSynthIterableInput) {
  let { signal, output, len, offset = 0 } = input;
  if (typeof output === 'undefined') {
    output = new Float32Array(len as number);
  } else {
    len = output.length;
  }
  return modulate(signal, output, offset, len as number, input);
}