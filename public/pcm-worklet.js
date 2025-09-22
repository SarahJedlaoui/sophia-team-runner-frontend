// public/pcm-worklet.js
// 48 kHz (usually) float32 -> 16 kHz PCM16, emit fixed 20ms (320 samples) chunks.

class PCMWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inRate = sampleRate || 48000; // AudioContext rate
    this.outRate = 16000;
    this.ratio = this.inRate / this.outRate;

    this._last = 0;
    this._dsPos = 0;            // fractional read position for downsampling
    this._outBuf = [];          // int16 samples
    this._packetSamples = 320;  // 20ms @ 16k = 320 samples
  }

  _pushInt16(sample) {
    // clamp & convert float->int16
    const s = Math.max(-1, Math.min(1, sample));
    const i = s < 0 ? s * 0x8000 : s * 0x7fff;
    this._outBuf.push(i | 0);
    if (this._outBuf.length >= this._packetSamples) {
      const buf = new ArrayBuffer(this._packetSamples * 2);
      const view = new DataView(buf);
      for (let i = 0; i < this._packetSamples; i++) {
        view.setInt16(i * 2, this._outBuf[i], true);
      }
      this.port.postMessage(buf);
      // keep any extra beyond packet size (usually exact)
      this._outBuf = this._outBuf.slice(this._packetSamples);
    }
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch0 = input[0];
    if (!ch0) return true;

    // Downsample using linear interpolation from inRate -> outRate
    let pos = this._dsPos;
    const step = this.ratio;

    // iterate over "virtual" 16k samples produced from this render quantum
    while (pos < ch0.length) {
      const i = Math.floor(pos);
      const frac = pos - i;
      const s0 = ch0[i] ?? this._last;
      const s1 = (i + 1 < ch0.length) ? ch0[i + 1] : s0;
      const s = s0 + (s1 - s0) * frac;
      this._pushInt16(s);
      pos += step;
    }

    this._dsPos = pos - ch0.length; // carry leftover fractional position
    this._last = ch0[ch0.length - 1] ?? this._last;
    return true;
  }
}

registerProcessor("pcm-worklet", PCMWorkletProcessor);
