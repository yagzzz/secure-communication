import { useEffect, useRef } from 'react';

export const usePolling = (callback, interval = 250) => {
  const savedCallback = useRef();
  const intervalRef = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      savedCallback.current?.();
    }

    if (interval !== null) {
      intervalRef.current = setInterval(tick, interval);
      return () => clearInterval(intervalRef.current);
    }
  }, [interval]);

  return intervalRef;
};
