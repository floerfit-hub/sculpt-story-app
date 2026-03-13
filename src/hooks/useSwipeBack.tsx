import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export const SWIPE_BACK_EVENT = "swipe-back";

// Stack of handlers — most recently registered (deepest child) gets priority
const handlerStack: Array<() => boolean> = [];

export const useSwipeBack = () => {
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = Math.abs(touch.clientY - touchStartY.current);

      if (dx < -80 && dy < 100) {
        // Try handlers from most recent (deepest) to oldest (shallowest)
        let handled = false;
        for (let i = handlerStack.length - 1; i >= 0; i--) {
          if (handlerStack[i]()) {
            handled = true;
            break;
          }
        }
        if (!handled) {
          navigate(-1);
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate]);
};

/** Hook for components to intercept swipe-back. Handler should return true if it handled the swipe. */
export const useSwipeBackHandler = (handler: () => boolean) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = () => handlerRef.current();
    handlerStack.push(wrappedHandler);
    return () => {
      const idx = handlerStack.indexOf(wrappedHandler);
      if (idx !== -1) handlerStack.splice(idx, 1);
    };
  }, []);
};
