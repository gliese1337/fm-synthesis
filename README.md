# FM Synthesis

Have single-channel frequency sample data?
Want single-channel audio PCM data?

That's what this package does.

`fm-synthesis` exports 4 functions:

* `fromFreq`: takes a single input buffer of instantaneous frequency shift samples, with constant amplitude.
* `fromPaired`: takes a pair of input buffers with instantaneous frequency and amplitude data.
* `fromInterlaced`: takes a single input buffer with interlaced [frequency, amplitude] samples.
* `fromSignalFn`: takes a function which, given a sampling time, returns a [frequency, amplitude] pair.

The common inputs to all of these functions are as follows:

```ts
interface BasicInput {
    sampleRate: number; // Samples per second for both input and output.
    phase?: number; // Initial phase offset. Defaults to zero.
    base?: number; // The base, carrier, or fundamental frequency to be modulated. Defaults to zero.
    start?: number; // Offset at which to begin reading data. Defaults to zero.
    end?: number; // Offset at which to stop reading data. Defaults the the minimum of the length of the input buffers.
    output?: FMOutputArray; // Optional pre-allocated buffer into which to write the generated samples.
    voice?: (t: number) => number; // Waveform function. For best results, `voice` should have a natural period of 2Pi. Defaults to Math.sin(t).
}
```

All frequency inputs are intepreted as linear frequency shifts from the base carrier frequency. If no base is provided, or it is explicitly set to zero, then the frequency inputs represent actual absolute frequency values, in Hz.

Each of these functions returns an `[output, phase]` pair, where `output` is a buffer of the actual output PCM samples, and `phase` is the accumulated phase shift across the output; this can be used for matching the endpoints of sequentially-computed buffers. If a pre-allocated buffer is not provided, a new `Float32Array` will be allocated.

Note that, in principle, negative modulation frequencies are possible. However, if negative frequency samples are provided, the maximum negative magnitude should not exceed `base/depth`. Depth may also be negative, which will simply invert all of the frequency samples.

Detailed individual types are as follows:

```ts
type FMSynthFreqInput = {
    frequency: ArrayLike<number>;
    amplitude?: number; // Defaults to one.
} & BasicInput;
function fromFreq(inputs: FMSynthFreqInput): [output: ArrayLike<number>, phase: number];
```

```ts
type FMSynthPairInput = {
    frequency: ArrayLike<number>;
    amplitude: ArrayLike<number>;
} & BasicInput;
function fromPaired(inputs: FMSynthPairInput): [output: ArrayLike<number>, phase: number];
```

```ts
type FMSynthInterlacedInput = {
    data: ArrayLike<number>;
} & BasicInput;
function fromInterlaced(inputs: FMSynthInterlacedInput): [output: ArrayLike<number>, phase: number];
```

In all of these cases, it is safe to re-use input buffers for output.

```ts
type FMSynthFunctionInput = ({
    signal(t: number): [frequency: number, amplitude: number];
    end: number;
} | {
    signal(t: number): [frequency: number, amplitude: number];
    output: FMOuputArray;
}) & BasicInput;
function fromSignalFn(inputs: FMSynthFunctionInput): [output: ArrayLike<number>, phase: number];
```

Note that for `fromSignalFn`, at least one of `end` and `output` must be specified in the inputs, since an endpoint cannot be inferred from the data source.

See `src/test.ts` for usage examples.
