import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ClearOfflineData } from "@/components/offline-snapshot";
export const metadata = { title: "Solicitação registrada" };
export default function Deleted() {
  return (
    <AuthShell>
      <ClearOfflineData />
      <h1>Solicitação registrada.</h1>
      <p className="auth-v2-intro">
        O acesso aos seus dados foi bloqueado. A exclusão definitiva será
        processada com segurança, incluindo o tratamento das cópias de segurança
        conforme a política de privacidade.
      </p>
      <Link className="auth-continue-link" href="/">
        Voltar ao início
      </Link>
    </AuthShell>
  );
}
