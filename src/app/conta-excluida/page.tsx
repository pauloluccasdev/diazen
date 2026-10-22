import Link from 'next/link';
export const metadata={title:'Solicitação registrada'};
export default function Deleted(){return <section className="welcome"><h1>Solicitação registrada.</h1><p className="intro">O acesso aos seus dados foi bloqueado. A exclusão definitiva será processada com segurança, incluindo o tratamento das cópias de segurança conforme a política de privacidade.</p><Link className="button-primary" href="/">Voltar ao início</Link></section>;}
