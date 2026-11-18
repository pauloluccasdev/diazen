"use client";
import "./profile-avatar.css";
import Image from "next/image";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { profileInitials } from "@/lib/profile-values";

function AvatarImage({ id, name }: { id: string; name: string | null }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <AvatarFallback name={name} />
  ) : (
    <Image
      unoptimized
      src={`/api/perfil/avatar?versao=${encodeURIComponent(id)}`}
      alt=""
      aria-hidden="true"
      width={320}
      height={320}
      onError={() => setFailed(true)}
    />
  );
}
function AvatarFallback({ name }: { name: string | null }) {
  const initials = profileInitials(name);
  return initials ? (
    <span>{initials}</span>
  ) : (
    <UserRound size="58%" aria-hidden="true" />
  );
}
export function ProfileAvatar({
  name = null,
  avatarId,
  size = 40,
}: {
  name?: string | null;
  avatarId?: string | null;
  size?: number;
}) {
  return (
    <span
      className="dz-profile-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
      aria-hidden="true"
    >
      {avatarId ? (
        <AvatarImage key={avatarId} id={avatarId} name={name} />
      ) : (
        <AvatarFallback name={name} />
      )}
    </span>
  );
}
