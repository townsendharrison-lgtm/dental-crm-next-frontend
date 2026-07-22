"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAuthStore } from "@/lib/stores/authStore";
import { USER_KEY } from "@/lib/auth/cookies";
import { usersApi } from "@/lib/api/users";
import { Avatar, Button, FormField, Input, Modal } from "@/components/ui";

interface UserAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserAccountModal({ open, onClose }: UserAccountModalProps) {
  const { user } = useAuth();
  const setAuthUser = useAuthStore((s) => s.setUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(user?.name || "");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(user?.avatar);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user?.name || "");
    setPreviewUrl(user?.avatar);
  }, [open, user?.name, user?.avatar]);

  const persistAuthUser = (next: NonNullable<typeof user>) => {
    setAuthUser(next);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const updated = await usersApi.uploadAvatar(file);
      const next = {
        ...user,
        name: updated.name || user.name,
        avatar: updated.avatar,
      };
      persistAuthUser(next);
      setPreviewUrl(updated.avatar);
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload profile photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    if (trimmed === user.name) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({ name: trimmed });
      persistAuthUser({
        ...user,
        name: updated.name,
        avatar: updated.avatar ?? user.avatar,
      });
      toast.success("Profile updated");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your profile"
      description="Update how your name and photo appear across the app."
      size="sm"
      closeOnBackdrop={false}
      closeOnEscape={false}
      footer={
        <Button type="button" onClick={() => void handleSave()} isLoading={saving} disabled={uploading}>
          Save changes
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              name={name || user.name || "User"}
              src={previewUrl}
              size="lg"
              className="h-20 w-20 rounded-xl text-lg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-60"
              aria-label="Change profile photo"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => void handlePhotoChange(e)}
            />
          </div>
          <p className="text-center text-xs text-slate-500">PNG, JPG, or WebP · max 5MB</p>
        </div>

        <FormField label="Display name" htmlFor="account-name" required>
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </FormField>

        <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</p>
          <p className="mt-0.5 truncate text-sm text-slate-300">{user.email}</p>
        </div>
      </div>
    </Modal>
  );
}
