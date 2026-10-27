import { useCallback, useMemo, useRef, useState } from "react";

export function useDropZoneHighlight() {
  const dropZoneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDropZone, setIsOverDropZone] = useState(false);

  const resetDropZoneHighlight = useCallback(() => {
    setIsDragging(false);
    setIsOverDropZone(false);
  }, []);

  const dragProps = useMemo(
    () => ({
      onDragStart: () => setIsDragging(true),
      onDragEnd: () => {
        setIsDragging(false);
        setIsOverDropZone(false);
      },
      onDropZoneHoverChange: setIsOverDropZone,
    }),
    [],
  );

  const dropZoneProps = useMemo(
    () => ({
      isActive: isDragging,
      isOver: isOverDropZone,
    }),
    [isDragging, isOverDropZone],
  );

  return {
    dropZoneRef,
    dragProps,
    dropZoneProps,
    resetDropZoneHighlight,
  };
}
