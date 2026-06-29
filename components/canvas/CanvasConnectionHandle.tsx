"use client";

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils/cn";

type CanvasConnectionHandleProps = {
  type: "source" | "target";
  position?: Position;
  visible?: boolean;
  className?: string;
};

export function CanvasConnectionHandle({
  type,
  position = type === "source" ? Position.Right : Position.Left,
  visible = false,
  className
}: CanvasConnectionHandleProps) {
  return (
    <Handle
      type={type}
      position={position}
      className={cn(
        "rufo-flow-handle",
        visible ? "rufo-flow-handle-visible" : "rufo-flow-handle-muted",
        className
      )}
    />
  );
}
