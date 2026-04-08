import { useMemo } from "react";

type ScrollResult = {
  scrollOffset: number;
  visibleCount: number;
};

export const useScroll = (
  cursor: number,
  totalItems: number,
  availableRows: number,
): ScrollResult => {
  return useMemo(() => {
    const visibleCount = Math.max(1, availableRows);

    if (totalItems <= visibleCount) {
      return { scrollOffset: 0, visibleCount };
    }

    let offset = cursor - Math.floor(visibleCount / 2);
    if (offset < 0) offset = 0;
    if (offset + visibleCount > totalItems) offset = totalItems - visibleCount;

    return { scrollOffset: offset, visibleCount };
  }, [cursor, totalItems, availableRows]);
};
