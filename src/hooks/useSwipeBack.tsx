import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Components can listen for this event and call stopImmediatePropagation() to handle swipe themselves
export const SWIPE_BACK_EVENT = "swipe-back";

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

      // Swipe left (finger moves right-to-left), at least 80px horizontal, not too vertical
      if (dx < -80 && dy < 100) {
        const event = new CustomEvent(SWIPE_BACK_EVENT, { cancelable: true });
        const wasNotPrevented = document.dispatchEvent(event);
        // If no handler prevented it, use default navigate(-1)
        if (wasNotPrevented) {
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
    const listener = (e: Event) => {
      if (handlerRef.current()) {
        e.preventDefault();
        // Stop other handlers from also firing (prevents double-back)
        e.stopImmediatePropagation();
      }
    };
    // Use capture phase so child (more specific) components aren't overridden
    document.addEventListener(SWIPE_BACK_EVENT, listener);
    return () => document.removeEventListener(SWIPE_BACK_EVENT, listener);
  }, []);
};
