"use client";
import { useActionState } from "react";
import { useOnline } from "@/lib/use-online";
import { signOut } from "@/app/entrar/actions";
import { LogOut } from "lucide-react";

export function LogoutButton({ icon = false }: { icon?: boolean }) {
  const [state, action, pending] = useActionState(signOut, { error: "" });
  const online = useOnline();
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!navigator.onLine) event.preventDefault();
      }}
    >
      <button
        type="submit"
        className="button-secondary button-logout"
        disabled={pending || !online}
      >
        {" "}
        {icon && <LogOut size={20} aria-hidden="true" />}
        {pending ? "Saindo…" : "Sair da conta"}
      </button>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
