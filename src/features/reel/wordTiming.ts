/**
 * Estimates per-word start/end times from narration text and a total speech
 * duration, for OpenReel's import_captions word-timed transcript format:
 * {segments:[{start,end,speaker?,words:[{word,start,end}]}]}
 *
 * There is no ASR/speech-to-text tool in the OpenReel catalog that fits
 * "transcribe this TTS audio" (only get_transcript, which reads a
 * pre-existing multicam .orma artifact) — so word timing is estimated by
 * character-weighted proportional split, the same approach the old
 * per-sentence captionCues() used at sentence granularity, now applied one
 * level deeper.
 */

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface CaptionSegment {
  start: number;
  end: number;
  speaker?: string;
  words: WordTiming[];
}

const MIN_WORD_DURATION = 0.05;

/** Split `totalDuration` across `weights` proportionally, flooring each share at `minDuration`. */
function splitProportional(totalDuration: number, weights: number[], minDuration: number): number[] {
  const n = weights.length;
  if (n === 0) return [];
  if (totalDuration <= 0) return weights.map(() => 0);

  const weightTotal = weights.reduce((s, w) => s + w, 0) || 1;
  let durations = weights.map((w) => (totalDuration * w) / weightTotal);

  let deficit = 0;
  const flexible: number[] = [];
  durations = durations.map((d, i) => {
    if (d < minDuration) {
      deficit += minDuration - d;
      return minDuration;
    }
    flexible.push(i);
    return d;
  });

  if (deficit > 0 && flexible.length > 0) {
    const flexTotal = flexible.reduce((s, i) => s + durations[i], 0) || 1;
    for (const i of flexible) {
      durations[i] -= deficit * (durations[i] / flexTotal);
    }
  }

  return durations;
}

export function estimateWordTimings(narration: string, speechEndSeconds: number): CaptionSegment[] {
  const sentences = narration
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [];

  const sentenceDurations = splitProportional(
    speechEndSeconds,
    sentences.map((s) => s.length || 1),
    0,
  );

  const segments: CaptionSegment[] = [];
  let t = 0;
  sentences.forEach((rawSentence, i) => {
    const sentenceStart = t;
    const sentenceDuration = sentenceDurations[i];
    const sentenceEnd = +(sentenceStart + sentenceDuration).toFixed(3);
    t = sentenceEnd;

    const cleanSentence = rawSentence.replace(/[.!?]+$/, "");
    const wordTexts = cleanSentence.split(/\s+/).filter(Boolean);
    if (wordTexts.length === 0) return;

    const wordDurations = splitProportional(
      sentenceDuration,
      wordTexts.map((w) => w.length || 1),
      Math.min(MIN_WORD_DURATION, sentenceDuration / wordTexts.length || MIN_WORD_DURATION),
    );

    let wt = sentenceStart;
    const words: WordTiming[] = wordTexts.map((word, wi) => {
      const start = +wt.toFixed(3);
      wt += wordDurations[wi];
      const end = +Math.min(wt, sentenceEnd).toFixed(3);
      return { word, start, end };
    });
    // Last word in the sentence always reaches exactly sentenceEnd, so
    // there's no gap carried into the next sentence's first word.
    if (words.length > 0) words[words.length - 1].end = sentenceEnd;

    segments.push({ start: sentenceStart, end: sentenceEnd, words });
  });

  return segments;
}
