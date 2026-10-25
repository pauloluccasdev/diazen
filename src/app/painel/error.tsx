"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <section className="welcome">
      <h1>Não foi possível carregar.</h1>
      <p className="intro">
        Seus dados não foram alterados. Confira a conexão e tente novamente.
      </p>
      <button
        className="button-primary"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      >
        {pending ? "Tentando novamente…" : "Tentar novamente"}
      </button>
    </section>
  );
}
