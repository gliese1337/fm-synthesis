import fs from 'fs';
import WavEncoder from 'wav-encoder';
import { fromPaired, fromFreq, fromInterlaced, fromSignalFn, fromIterable } from ".";

const sampleRate = 44100;
const frequency = new Float32Array(sampleRate);
const amplitude = new Float32Array(sampleRate);
for (let i = 0; i < sampleRate; i++) {
  frequency[i] = 440 * (i / sampleRate);
  amplitude[i] = 1 - (i / sampleRate);
}

const interlace = new Float32Array(sampleRate*2);
for (let i = 0; i < sampleRate; i++) {
  interlace[2*i] = frequency[i];
  interlace[2*i+1] = amplitude[i];
}

const output1 = new Float32Array(sampleRate);
const output2 = new Float32Array(sampleRate);

function wav(name: string, output: Float32Array) {
  WavEncoder.encode({
    sampleRate,
    channelData: [output],
  }).then((buffer) => {
    fs.writeFileSync(name, new Uint8Array(buffer));
  });  
}

function checkEqual(a: Float32Array, b: Float32Array, c: string, d: string, voice: string) {
  for (let i = 0; i < sampleRate; i++) {
    if (a[i] !== b[i]) {
      console.error(`${c} output does not match ${d} output for ${voice}`);
      return;
    }
  }
}

for (const voice of ['sine', 'triangle', 'sawtooth', 'square'] as any[]) {

  fromPaired({ sampleRate, frequency, amplitude, voice, base: 440, output: output1 });
  wav(`${voice}_p.wav`, output1);
  
  fromInterlaced({ sampleRate, data: interlace, voice, base: 440, output: output2 });
  wav(`${voice}_i.wav`, output2);
  checkEqual(output1, output2, 'Paired', 'Interlaced', voice);

  fromFreq({ sampleRate, frequency, voice, base: 440, output: output2 });
  wav(`${voice}_f.wav`, output2);
  // This is expected to be different
  //checkEqual(output1, output2, 'Paired', 'Frequency', voice);

  fromSignalFn({
    signal(t) { return [frequency[t], amplitude[t]]; },
    sampleRate, voice, base: 440, output: output2,
  });
  wav(`${voice}_l.wav`, output2);
  checkEqual(output1, output2, 'Paired', 'Function', voice);

  fromIterable({ 
    signal: (function*(){
      for (let i = 0; i < sampleRate; i++) yield [frequency[i], amplitude[i]] as [number, number];
    })(),
    sampleRate, voice, base: 440, output: output2,
  });
  wav(`${voice}_g.wav`, output2);
  checkEqual(output1, output2, 'Paired', 'Iterable', voice);
}