import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export const useSwipeBack = () => {
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger from left edge (first 30px)
      if (touch.clientX < 30) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX.current;
      const dy = Math.abs(touch.clientY - touchStartY.current!);

      // Swipe right from left edge, at least 80px horizontal, not too vertical
      if (dx > 80 && dy < 100) {
        navigate(-1);
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
