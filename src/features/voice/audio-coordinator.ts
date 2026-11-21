/**
 * Global audio coordinator — ensures only one audio element plays at a time.
 * Any <audio> using exclusivePlay pauses all other audio on the page first.
 */

let currentAudio: HTMLAudioElement | null = null;

export function exclusivePlay(audio: HTMLAudioElement): void {
  if (currentAudio && currentAudio !== audio) {
    currentAudio.pause();
  }
  currentAudio = audio;
}

export function stopAllAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
