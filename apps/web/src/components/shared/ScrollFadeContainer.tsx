import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ScrollFadeContainerProps {
  children: React.ReactNode;
  className?: string;
  fadeHeightPx?: number;
}

export const ScrollFadeContainer: React.FC<ScrollFadeContainerProps> = ({
  children,
  className = '',
  fadeHeightPx = 28,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const hasOverflow = el.scrollHeight > el.clientHeight + 4;
    const isScrolledFromTop = el.scrollTop > 6;
    const isNotAtBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 6;

    setShowTopFade(isScrolledFromTop);
    setShowBottomFade(hasOverflow && isNotAtBottom);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);

    return () => observer.disconnect();
  }, [children, checkScroll]);

  // Dynamic CSS linear gradient mask
  let maskImage = 'none';
  if (showTopFade && showBottomFade) {
    maskImage = `linear-gradient(to bottom, transparent, black ${fadeHeightPx}px, black calc(100% - ${fadeHeightPx}px), transparent 100%)`;
  } else if (showBottomFade) {
    maskImage = `linear-gradient(to bottom, black calc(100% - ${fadeHeightPx}px), transparent 100%)`;
  } else if (showTopFade) {
    maskImage = `linear-gradient(to bottom, transparent, black ${fadeHeightPx}px, black 100%)`;
  }

  return (
    <div
      ref={containerRef}
      onScroll={checkScroll}
      style={{
        maskImage,
        WebkitMaskImage: maskImage,
      }}
      className={`overflow-y-auto transition-all duration-150 ${className}`}
    >
      {children}
    </div>
  );
};
