import { useEffect, useState } from 'react';
import type { BaseGameEngine } from './BaseGameEngine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGameEngine<TEngine extends BaseGameEngine<any, any, any, any>>(
  factory: () => TEngine
): {
  engine: TEngine;
  snapshot: ReturnType<TEngine['getSnapshot']>;
} {
  const [engine] = useState<TEngine>(factory);
  const [snapshot, setSnapshot] = useState<ReturnType<TEngine['getSnapshot']>>(
    () => engine.getSnapshot() as ReturnType<TEngine['getSnapshot']>
  );

  useEffect(() => {
    engine.mount();
    const unsubscribe = engine.subscribe(() => {
      setSnapshot(engine.getSnapshot() as ReturnType<TEngine['getSnapshot']>);
    });
    return () => {
      unsubscribe();
      engine.destroy();
    };
  }, [engine]);

  return { engine, snapshot };
}
