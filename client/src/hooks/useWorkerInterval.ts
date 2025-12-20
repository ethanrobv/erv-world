import { useEffect, useRef } from 'react';

const workerScript = `
  self.onmessage = function(e) {
    const { type, delay, id } = e.data;
    if (type === 'start') {
      const intervalId = setInterval(() => {
        self.postMessage({ type: 'tick', id });
      }, delay);
      self.postMessage({ type: 'started', intervalId });
    } else if (type === 'stop') {
      clearInterval(e.data.intervalId);
    }
  };
`;

export const useWorkerInterval = (callback: () => void, delay: number | null) => {
    const savedCallback = useRef(callback);
    const workerRef = useRef<Worker | null>(null);
    const intervalIdRef = useRef<number | null>(null);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay === null) return;

        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        workerRef.current = worker;

        worker.onmessage = (e) => {
            if (e.data.type === 'tick') {
                savedCallback.current();
            } else if (e.data.type === 'started') {
                intervalIdRef.current = e.data.intervalId;
            }
        };

        worker.postMessage({ type: 'start', delay, id: Date.now() });

        return () => {
            if (intervalIdRef.current !== null) {
                worker.postMessage({ type: 'stop', intervalId: intervalIdRef.current });
            }
            worker.terminate();
        };
    }, [delay]);
};
