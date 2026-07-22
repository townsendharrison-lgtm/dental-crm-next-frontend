import { toast } from "sonner";

type Messages<T> = {
  loading: string;
  success: string | ((data: T) => string);
  error?: string | ((err: unknown) => string);
};

/**
 * Show an immediate "in progress" toast, then swap to success/error when the
 * promise settles. Prefer this over success-only toasts on form submits.
 */
export function toastAction<T>(promise: Promise<T>, messages: Messages<T>): Promise<T> {
  const p = Promise.resolve(promise);
  toast.promise(p, {
    loading: messages.loading,
    success: messages.success,
    error: (err) => {
      if (typeof messages.error === "function") return messages.error(err);
      if (typeof messages.error === "string") return messages.error;
      if (err && typeof err === "object" && "message" in err) {
        const msg = (err as { message?: unknown }).message;
        if (typeof msg === "string" && msg.trim()) return msg;
      }
      return "Something went wrong";
    },
  });
  return p;
}

/** Imperative loading → success/error (for mutate callbacks / multi-step saves). */
export function withToastLoading(
  loadingMessage: string,
): { id: string | number; success: (msg: string) => void; error: (msg: string) => void } {
  const id = toast.loading(loadingMessage);
  return {
    id,
    success: (msg) => toast.success(msg, { id }),
    error: (msg) => toast.error(msg, { id }),
  };
}
