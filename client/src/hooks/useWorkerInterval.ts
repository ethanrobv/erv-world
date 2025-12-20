import { useEffect, useRef } from 'react';

/* -------------------------------------------------------------------------- */
/* WORKER SOURCE                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Stringified worker script to avoid external file dependencies.
 * Uses a self-contained interval to send 'tick' messages back to the main thread.
 */
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

/* -------------------------------------------------------------------------- */
/* HOOK DEFINITION                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A robust alternative to setInterval that runs in a Web Worker.
 * Essential for game loops or watchdogs that must not be throttled when the tab is idled/put in background.
 * * @param callback - The function to execute on every tick.
 * @param callback - Function to call at each interval.
 * @param delay - Delay in milliseconds. Pass null to stop the interval.
 */
export const useWorkerInterval = (callback: () => void, delay: number | null): void => {
    const savedCallback = useRef(callback);
    const workerRef = useRef<Worker | null>(null);
    const intervalIdRef = useRef<number | null>(null);

    // Remember the latest callback if it changes.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the worker and interval.
    useEffect(() => {
        if (delay === null) return;

        // 1. Create worker via Blob to avoid external file hosting issues
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        workerRef.current = worker;

        // 2. Handle messages from Worker
        worker.onmessage = (e: MessageEvent) => {
            const { type, intervalId } = e.data;

            if (type === 'tick') {
                savedCallback.current();
            } else if (type === 'started') {
                intervalIdRef.current = intervalId;
            }
        };

        // 3. Initialize the interval
        worker.postMessage({
            type: 'start',
            delay,
            id: Date.now()
        });

        // 4. Cleanup
        return () => {
            if (intervalIdRef.current !== null) {
                worker.postMessage({ type: 'stop', intervalId: intervalIdRef.current });
            }
            worker.terminate();
            URL.revokeObjectURL(workerUrl); // Clean up memory
            workerRef.current = null;
            intervalIdRef.current = null;
        };
    }, [delay]);
};
