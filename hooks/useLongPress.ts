
import { useRef, useCallback, useState } from 'react';

interface Options {
  onLongPress: () => void;
  onClick: () => void;
  ms?: number;
}

export function useLongPress({ onLongPress, onClick, ms = 800 }: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const [isPressed, setIsPressed] = useState(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    setIsPressed(true);
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setIsPressed(false);
      onLongPress();
      if (navigator.vibrate) navigator.vibrate(50);
    }, ms);
  }, [onLongPress, ms]);

  const stop = useCallback(() => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onMouseUp = useCallback(() => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPress.current) {
      onClick();
    }
  }, [onClick]);

  return {
    handlers: {
      onMouseDown: start,
      onMouseUp: onMouseUp,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: onMouseUp,
    },
    isPressed
  };
}
