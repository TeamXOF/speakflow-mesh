'use client';

interface WaveformVisualizerProps {
  audioData: Uint8Array;
}

export default function WaveformVisualizer({ audioData }: WaveformVisualizerProps) {
  // Take a subset of frequencies (the lower-mid range) for visualization
  const bars = Array.from(audioData).slice(0, 20);

  return (
    <div className="flex items-end justify-center h-full w-full gap-2 px-8">
      {bars.map((value, i) => {
        // Normalize value between 0 and 1, minimum height of 8px
        const height = Math.max(8, (value / 255) * 100);
        return (
          <div
            key={i}
            className="w-4 bg-[var(--accent-primary)] rounded-full transition-all duration-75 ease-out"
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
}
