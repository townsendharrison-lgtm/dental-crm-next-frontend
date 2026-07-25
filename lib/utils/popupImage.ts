import type { PopupAdvertisement, PopupImageFit, PopupImageHeight } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function popupImageFit(p: PopupAdvertisement | null | undefined): PopupImageFit {
  const raw = (p?.imageFit ?? p?.image_fit ?? "cover") as string;
  if (raw === "contain" || raw === "original" || raw === "cover") return raw;
  return "cover";
}

export function popupImageHeight(p: PopupAdvertisement | null | undefined): PopupImageHeight {
  const raw = (p?.imageHeight ?? p?.image_height ?? "md") as string;
  if (raw === "sm" || raw === "md" || raw === "lg") return raw;
  return "md";
}

const HEIGHT_CLASS: Record<PopupImageHeight, string> = {
  sm: "h-40 sm:h-44",
  md: "h-56 sm:h-64",
  lg: "h-72 sm:h-80",
};

const PREVIEW_HEIGHT_CLASS: Record<PopupImageHeight, string> = {
  sm: "h-28",
  md: "h-40",
  lg: "h-52",
};

export function popupImageFrameClass(
  fit: PopupImageFit,
  height: PopupImageHeight,
  variant: "live" | "preview" = "live",
) {
  if (fit === "original") {
    return cn(
      "w-full overflow-hidden",
      variant === "live" ? "max-h-96" : "max-h-56",
    );
  }
  return cn(
    "w-full overflow-hidden",
    variant === "live" ? HEIGHT_CLASS[height] : PREVIEW_HEIGHT_CLASS[height],
  );
}

export function popupImageClass(fit: PopupImageFit) {
  if (fit === "contain") {
    return "h-full w-full object-contain object-center";
  }
  if (fit === "original") {
    return "block w-full h-auto max-h-full object-contain object-center";
  }
  return "h-full w-full object-cover object-center";
}
