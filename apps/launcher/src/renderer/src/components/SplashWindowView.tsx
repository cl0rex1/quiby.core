import React, { useState, useEffect } from 'react';

interface SplashWindowViewProps {
  onFinish?: () => void;
}

export const SplashWindowView: React.FC<SplashWindowViewProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const steps = [
      { p: 35, delay: 250 },
      { p: 70, delay: 600 },
      { p: 100, delay: 950 },
    ];

    const timeouts = steps.map((s) =>
      setTimeout(() => {
        setProgress(s.p);
      }, s.delay)
    );

    const finishTimeout = setTimeout(() => {
      onFinish?.();
      window.quibyApi?.splashReady();
    }, 1250);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onFinish]);

  return (
    <div className="w-screen h-screen bg-onyx-950 flex flex-col justify-between p-7 select-none overflow-hidden relative border border-onyx-border">
      {/* Top Left: Clean 'quiby.' Title */}
      <div className="flex items-center">
        <span className="font-black text-xl tracking-tight text-white">
          quiby<span className="text-quiby-purple">.</span>
        </span>
      </div>

      {/* Bottom: Clean Slider-Track Progress Bar (No stick, no icons, no clutter) */}
      <div className="w-full">
        <div className="relative w-full h-1.5 bg-onyx-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-quiby-purple via-quiby-purpleLight to-quiby-accent rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
