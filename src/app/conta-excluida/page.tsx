import { ReturnLink } from "@/components/return-link";
import { ClearOfflineData } from "@/components/offline-snapshot";
export const metadata = { title: "Solicitação registrada" };
export default function Deleted() {
  return (
    <section className="welcome">
      <ClearOfflineData />
      <h1>Solicitação registrada.</h1>
      <p className="intro">
        O acesso aos seus dados foi bloqueado. A exclusão definitiva será
        processada com segurança, incluindo o tratamento das cópias de segurança
        conforme a política de privacidade.
      </p>
      <ReturnLink href="/">Voltar ao início</ReturnLink>
    </section>
  );
}
