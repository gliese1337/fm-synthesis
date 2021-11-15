import fs from 'fs';
import WavEncoder from 'wav-encoder';
import { fromPaired, fromFreq } from ".";

const sampleRate = 44100;
const frequency = new Float32Array(sampleRate);
const amplitude = new Float32Array(sampleRate);
for (let i = 0; i < sampleRate; i++) {
    frequency[i] = 440 * (i / sampleRate);
    amplitude[i] = 1 - (i / sampleRate);
}

const output = new Float32Array(sampleRate);
fromPaired({ sampleRate, frequency, amplitude, base: 440, output });

WavEncoder.encode({
    sampleRate,
    channelData: [output],
  }).then((buffer) => {
    fs.writeFileSync("sinesweep.wav", new Uint8Array(buffer));
  });

  
function sawtooth(t: number) {
    const x = t / (2 * Math.PI);
    return 2 * (x - Math.floor(x) - 0.5);
}


fromFreq({ sampleRate, frequency, voice: sawtooth, base: 440, output });

WavEncoder.encode({
    sampleRate,
    channelData: [output],
  }).then((buffer) => {
    fs.writeFileSync("sawsweep.wav", new Uint8Array(buffer));
  });
