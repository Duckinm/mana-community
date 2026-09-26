import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Shortest-column masonry. CSS `columns` packs column-first and grid
 * `row-span` leaves holes, so we measure each item and place it into the
 * currently-shortest column. Items keep source order, so the first row fills
 * left-to-right before wrapping, and there are no vertical gaps.
 */
function columnsForWidth(width: number): number {
  if (width >= 1280) return 6;
  if (width >= 1024) return 5;
  if (width >= 768) return 4;
  if (width >= 480) return 3;
  return 2;
}

type Layout = {
  tops: number[];
  lefts: number[];
  colWidth: number;
  height: number;
};

export function MasonryGrid({
  children,
  className,
  gap = 16,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const items = Children.toArray(children);
  const [layout, setLayout] = useState<Layout | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const style = getComputedStyle(container);
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const padRight = parseFloat(style.paddingRight) || 0;
    const padTop = parseFloat(style.paddingTop) || 0;
    const contentWidth = container.clientWidth - padLeft - padRight;
    if (contentWidth <= 0) return;

    const cols = columnsForWidth(contentWidth);
    const colWidth = (contentWidth - gap * (cols - 1)) / cols;
    const colHeights = new Array<number>(cols).fill(0);
    const tops: number[] = [];
    const lefts: number[] = [];

    // Apply the column width before measuring so the very first pass reads the
    // real (constrained) height instead of the full-width height.
    for (const el of itemRefs.current) {
      if (el) el.style.width = `${colWidth}px`;
    }

    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      let shortest = 0;
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < colHeights[shortest]) shortest = c;
      }
      tops[i] = padTop + colHeights[shortest];
      lefts[i] = padLeft + shortest * (colWidth + gap);
      colHeights[shortest] += el.getBoundingClientRect().height + gap;
    });

    const tallest = colHeights.length ? Math.max(...colHeights) : 0;
    setLayout({
      tops,
      lefts,
      colWidth,
      height: Math.max(0, tallest - gap) + padTop,
    });
  }, [gap]);

  useLayoutEffect(() => {
    measure();
  }, [measure, items.length]);

  useEffect(() => {
    const observer = new ResizeObserver(() => measure());
    if (containerRef.current) observer.observe(containerRef.current);
    for (const el of itemRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [measure, items.length]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", height: layout?.height }}
    >
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key != null ? child.key : i}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            top: layout?.tops[i] ?? 0,
            left: layout?.lefts[i] ?? 0,
            width: layout?.colWidth,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
