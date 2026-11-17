/* zzfx ships no types: this is what the room uses of it (src/room/audio.ts). */
declare module 'zzfx' {
  export const ZZFX: {
    /** The loudness every sound is played at, from 0 to 1. */
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    /** The samples of one sound, from its 21 parameters in their order. */
    buildSamples(...parameters: number[]): Float32Array;
    playSamples(channels: Float32Array[], volumeScale?: number, rate?: number, pan?: number, loop?: boolean): AudioBufferSourceNode;
  };
}
