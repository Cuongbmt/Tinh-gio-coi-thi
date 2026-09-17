import React from 'react';

interface ResizeColumnHandleProps {
  colKey: string;
  isResizing?: boolean;
  onMouseDown: (colKey: string, e: React.MouseEvent) => void;
  onDoubleClick: (colKey: string, e: React.MouseEvent) => void;
  title?: string;
  className?: string;
}

export const ResizeColumnHandle: React.FC<ResizeColumnHandleProps> = ({
  colKey,
  isResizing = false,
  onMouseDown,
  onDoubleClick,
  title = 'Kéo sang trái/phải để dãn ô (nhấp đúp để về chuẩn)',
  className = '',
}) => {
  return (
    <div
      onMouseDown={(e) => onMouseDown(colKey, e)}
      onDoubleClick={(e) => onDoubleClick(colKey, e)}
      title={title}
      className={`absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none z-30 group flex items-center justify-center ${className}`}
    >
      {/* Visual drag bar */}
      <div
        className={`w-[3px] h-full transition-colors ${
          isResizing
            ? 'bg-blue-600 shadow-sm'
            : 'bg-transparent group-hover:bg-blue-400/80 active:bg-blue-600'
        }`}
      />
    </div>
  );
};
