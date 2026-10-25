"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  visibilityLabel?: string;
};

export function PasswordInput({
  visibilityLabel = "senha",
  disabled,
  id,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const revealed = visible && !disabled;
  return (
    <span className="password-field">
      <input
        {...props}
        id={id}
        disabled={disabled}
        type={revealed ? "text" : "password"}
      />
      <button
        className="password-toggle"
        type="button"
        disabled={disabled}
        aria-label={`${revealed ? "Ocultar" : "Mostrar"} ${visibilityLabel}`}
        aria-controls={id}
        aria-pressed={revealed}
        onClick={() => setVisible(!visible)}
      >
        {revealed ? (
          <EyeOff size={20} aria-hidden="true" />
        ) : (
          <Eye size={20} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
