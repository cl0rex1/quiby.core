import React, { useEffect } from 'react';
import { MotionToggle } from './MotionProvider';

export function SplashWindowView() {
  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        void window.quibyApi?.splashReady();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);
  return (
    <main className="splash-screen">
      <header>
        <span className="splash-wordmark">
          quiby<span>.</span>
        </span>
        <span>CORE / S6</span>
      </header>
      <section>
        <div className="splash-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <p className="page-kicker">CREATE / AERONAUTICS</p>
        <h1>Мир ждёт.</h1>
      </section>
      <footer>
        <div className="splash-status" role="status">
          <span>Открываем лаунчер</span>
          <span className="splash-ellipsis">···</span>
        </div>
        <div className="splash-progress" aria-hidden="true">
          <i />
        </div>
        <div className="splash-bottom">
          <span>MINECRAFT 1.21.1</span>
          <MotionToggle compact />
        </div>
      </footer>
    </main>
  );
}
