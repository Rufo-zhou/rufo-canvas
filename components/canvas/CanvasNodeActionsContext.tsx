"use client";

import { createContext, useContext, type ReactNode } from "react";

export type CanvasNodeActions = {
  onBeforeTransform: () => void;
  onTransformEnd: () => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onUseAsReference: (nodeId: string) => void;
  onRename: (nodeId: string, name: string) => void;
  onOpenPreview: (nodeId: string) => void;
  onRetryGeneration: (nodeId: string) => void;
};

const CanvasNodeActionsContext = createContext<CanvasNodeActions | null>(null);

export function CanvasNodeActionsProvider({
  actions,
  children
}: {
  actions: CanvasNodeActions;
  children: ReactNode;
}) {
  return (
    <CanvasNodeActionsContext.Provider value={actions}>
      {children}
    </CanvasNodeActionsContext.Provider>
  );
}

export function useCanvasNodeActions() {
  return useContext(CanvasNodeActionsContext);
}
