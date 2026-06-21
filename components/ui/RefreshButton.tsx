"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils/cn";

export interface RefreshButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  title?: string;
}

export function RefreshButton({
  onClick,
  isLoading = false,
  className,
  title,
}: RefreshButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all rounded-xl cursor-pointer",
        className
      )}
      title={title}
    >
      <RefreshCw
        className={cn(
          "w-4 h-4 transition-transform duration-500",
          isLoading && "animate-spin"
        )}
      />
    </Button>
  );
}
