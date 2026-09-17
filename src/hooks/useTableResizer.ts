import React, { useState, useCallback, useEffect, useRef } from 'react';

export type RowDensity = 'compact' | 'normal' | 'comfortable' | 'spacious';

export interface UseTableResizerOptions {
  storageKey?: string;
  defaultWidths: Record<string, number>;
  defaultDensity?: RowDensity;
  minColWidth?: number;
  maxColWidth?: number;
}

export const DENSITY_CONFIG: Record<
  RowDensity,
  {
    label: string;
    py: string;
    minHeight: string;
    fontSize: string;
    paddingYPx: number;
  }
> = {
  compact: {
    label: 'Gọn (Nhỏ)',
    py: 'py-1',
    minHeight: 'h-7',
    fontSize: 'text-[11px]',
    paddingYPx: 4,
  },
  normal: {
    label: 'Chuẩn (Vừa)',
    py: 'py-2',
    minHeight: 'h-9',
    fontSize: 'text-xs',
    paddingYPx: 8,
  },
  comfortable: {
    label: 'Thoáng (Rộng)',
    py: 'py-3',
    minHeight: 'h-12',
    fontSize: 'text-sm',
    paddingYPx: 12,
  },
  spacious: {
    label: 'Rộng rãi',
    py: 'py-4',
    minHeight: 'h-16',
    fontSize: 'text-base',
    paddingYPx: 16,
  },
};

export function useTableResizer({
  storageKey,
  defaultWidths,
  defaultDensity = 'normal',
  minColWidth = 40,
  maxColWidth = 900,
}: UseTableResizerOptions) {
  // Load initial column widths from localStorage if available
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`table_widths_${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...defaultWidths, ...parsed };
        }
      } catch {
        // ignore
      }
    }
    return defaultWidths;
  });

  // Row density (vertical stretch)
  const [density, setDensity] = useState<RowDensity>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`table_density_${storageKey}`);
        if (saved && saved in DENSITY_CONFIG) {
          return saved as RowDensity;
        }
      } catch {
        // ignore
      }
    }
    return defaultDensity;
  });

  // Custom vertical stretch factor in pixels (e.g. additional padding)
  const [verticalPadding, setVerticalPadding] = useState<number>(() => {
    return DENSITY_CONFIG[defaultDensity].paddingYPx;
  });

  // Text wrap option
  const [wrapText, setWrapText] = useState<boolean>(true);

  // Active resizing state
  const [activeResizingCol, setActiveResizingCol] = useState<string | null>(null);
  const dragRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Save to localStorage
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`table_widths_${storageKey}`, JSON.stringify(columnWidths));
      } catch {
        // ignore
      }
    }
  }, [columnWidths, storageKey]);

  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`table_density_${storageKey}`, density);
      } catch {
        // ignore
      }
    }
  }, [density, storageKey]);

  // Handle mouse down on column border
  const startColResize = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentWidth = columnWidths[colKey] || defaultWidths[colKey] || 100;
      dragRef.current = {
        colKey,
        startX: e.clientX,
        startWidth: currentWidth,
      };
      setActiveResizingCol(colKey);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = moveEvent.clientX - dragRef.current.startX;
        const newWidth = Math.max(minColWidth, Math.min(maxColWidth, dragRef.current.startWidth + delta));

        setColumnWidths((prev) => ({
          ...prev,
          [dragRef.current!.colKey]: Math.round(newWidth),
        }));
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        setActiveResizingCol(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [columnWidths, defaultWidths, minColWidth, maxColWidth]
  );

  // Double click reset a column to default
  const resetColWidth = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (defaultWidths[colKey]) {
        setColumnWidths((prev) => ({
          ...prev,
          [colKey]: defaultWidths[colKey],
        }));
      }
    },
    [defaultWidths]
  );

  // Reset all column widths to default
  const resetAllWidths = useCallback(() => {
    setColumnWidths(defaultWidths);
    setDensity(defaultDensity);
    setVerticalPadding(DENSITY_CONFIG[defaultDensity].paddingYPx);
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`table_widths_${storageKey}`);
        localStorage.removeItem(`table_density_${storageKey}`);
      } catch {
        // ignore
      }
    }
  }, [defaultWidths, defaultDensity, storageKey]);

  // Adjust density and sync vertical padding
  const handleSetDensity = useCallback((newDensity: RowDensity) => {
    setDensity(newDensity);
    setVerticalPadding(DENSITY_CONFIG[newDensity].paddingYPx);
  }, []);

  const totalTableWidth = (Object.values(columnWidths) as number[]).reduce(
    (acc: number, w: number) => acc + (w || 0),
    0
  );

  return {
    columnWidths,
    density,
    verticalPadding,
    setVerticalPadding,
    wrapText,
    setWrapText,
    activeResizingCol,
    startColResize,
    resetColWidth,
    resetAllWidths,
    setDensity: handleSetDensity,
    densityConfig: DENSITY_CONFIG[density],
    totalTableWidth,
  };
}
