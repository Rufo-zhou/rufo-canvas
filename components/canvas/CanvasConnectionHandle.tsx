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
  const label =
    type === "source" ? "从此节点继续生成" : "连接到此节点";

  return (
    <Handle
      type={type}
      position={position}
      aria-label={label}
      title={label}
      className={cn(
        "rufo-flow-handle",
        visible ? "rufo-flow-handle-visible" : "rufo-flow-handle-muted",
        className
      )}
    />
  );
}
