import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Sem conexão" };

export default function Offline() {
  return (
    <section className="welcome">
      <WifiOff className="accent" size={32} aria-hidden="true" />
      <h1>Você está sem conexão.</h1>
      <p className="intro">
        Conecte-se à internet para continuar. Nenhum registro pode ser criado ou
        alterado enquanto você estiver offline.
      </p>
      <Link className="button-primary" href="/">
        Tentar novamente
      </Link>
    </section>
  );
}
