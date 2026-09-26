import { client } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import type { UserPrefs } from "@/lib/user-types";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_BYTES = 2 * 1024 * 1024;

function fileToBase64(
  file: File,
): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [prefix, data] = result.split(",");
      const mediaType = prefix.replace("data:", "").replace(";base64", "");
      resolve({ data: data ?? "", mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  user: UserPrefs | null;
}

export function ProfileAvatar({ user }: Props) {
  const { t } = useTranslation("settings");
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = (user?.name ?? "U").charAt(0).toUpperCase();
  const avatarColor = user?.avatarColor ?? "#42b0a8";
  const avatarUrl = user?.image ?? null;

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      setError(t("profile.imageTooLarge"));
      return;
    }
    setError(null);
    setUploading(true);

    try {
      const { data, mediaType } = await fileToBase64(file);
      const result = await client.api.users.avatar.post({ data, mediaType });
      if (result.error) throw new Error(t("profile.uploadFailed"));
      const newUrl = (result.data as { avatarUrl: string }).avatarUrl;

      queryClient.setQueryData(queryKeys.user, (old: UserPrefs | undefined) =>
        old ? { ...old, image: newUrl } : old,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-4 mb-4 pb-3.5 border-b border-border-subtle">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group w-14 h-14 rounded-xl shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={t("profile.uploadAvatar")}
        style={{
          background: avatarUrl ? "transparent" : avatarColor + "33",
          border: `1px solid ${avatarColor}55`,
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.name ?? "Avatar"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="text-xl font-medium font-sans"
            style={{ color: avatarColor }}
          >
            {initial}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-fast rounded-2xl">
          {uploading ? (
            <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-white"
            >
              <path
                d="M8 3v8M4 7l4-4 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </button>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {user?.name ?? "—"}
        </p>
        <p className="text-sm mt-0.5 text-muted-foreground">
          {user?.email ?? "—"}
        </p>
        {user?.freelancerType && (
          <p className="text-xs mt-0.5 text-caption">{user.freelancerType}</p>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs mt-1.5 text-primary hover:text-primary/80 transition-colors duration-fast disabled:opacity-50"
        >
          {uploading ? t("profile.uploading") : t("profile.changePhoto")}
        </button>
        {error && <p className="text-xs mt-1 text-danger">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}
