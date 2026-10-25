export const metadata = { title: "Privacidade" };
export default function Privacy() {
  return (
    <article className="content-card prose">
      <p className="eyebrow">DIAZEN · USO PESSOAL</p>
      <h1>Privacidade.</h1>
      <p>
        O Diazen, da Lucx Tech, organiza seus registros de alimentação, água,
        atividades, peso, medidas e fotos. Informações corporais e fotografias
        são tratadas como sensíveis, com acesso restrito ao titular.
      </p>
      <h2>Dados e finalidade</h2>
      <p>
        Usamos seu e-mail para autenticação e recuperação de acesso. Projetos,
        metas e registros servem para mostrar sua rotina e evolução. Campos
        opcionais podem permanecer em branco. O aplicativo não precisa de
        localização nem de acesso à agenda.
      </p>
      <h2>Armazenamento e acesso</h2>
      <p>
        Supabase processa autenticação, banco e arquivos. A hospedagem da
        aplicação processa as requisições. As fotos são otimizadas e têm
        metadados sensíveis removidos antes do armazenamento. Não há publicidade
        nem envio de seus registros para ferramentas de IA.
      </p>
      <h2>Importação de plano alimentar</h2>
      <p>
        A leitura do PDF começa no navegador. Se o leitor local falhar, o
        arquivo pode ser processado temporariamente na hospedagem do Diazen, em
        memória, para extrair as refeições. O PDF original não é salvo no banco,
        no Storage ou nos backups e não é enviado a ferramentas de IA. Apenas os
        dados revisados e confirmados por você são salvos como versões privadas.
      </p>
      <h2>Consulta nutricional online</h2>
      <p>
        Ao importar ou revisar um plano, os alimentos sem composição na TACO são
        consultados automaticamente no Open Food Facts. Enviamos apenas o nome
        do alimento e o código do produto encontrado; não enviamos seu PDF,
        conta, refeições completas ou fotografias. A fonte é colaborativa e deve
        ser conferida. Ao usar uma referência padrão, a composição e sua origem
        ficam registradas no seu plano, e os valores podem variar conforme a
        marca consumida.
      </p>
      <h2>Conexão opcional com Strava</h2>
      <p>
        Ao conectar sua conta, você autoriza a leitura de atividades no Strava,
        inclusive privadas. Consultamos até cinco atividades recentes e
        mostramos nome, modalidade, data, duração, distância e calorias quando
        disponíveis. Os dados são exibidos somente para você, não são combinados
        com o diário alimentar e não são copiados para o banco, exportação,
        backups ou ferramentas de IA. A consulta fica temporariamente na memória
        desta tela, por até 15 minutos, sem leitura offline.
      </p>
      <p>
        A conexão usa um cookie cifrado e inacessível ao JavaScript, vinculado à
        sua conta Diazen, com validade de até sete dias neste navegador. Sair da
        conta remove esse cookie. Em Atividades, “Desconectar Strava” limpa a
        consulta e solicita a revogação do acesso; você também pode remover a
        autorização em{" "}
        <a
          href="https://www.strava.com/settings/apps"
          target="_blank"
          rel="noopener noreferrer"
        >
          Meus aplicativos no Strava
        </a>
        . Nenhuma dessas ações exclui suas atividades originais no Strava. O
        Strava pode monitorar dados de uso de sua API conforme sua{" "}
        <a
          href="https://www.strava.com/legal/api_policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          política
        </a>
        .
      </p>
      <h2>Dispositivo e conexão</h2>
      <p>
        A instalação usa cookies de sessão. A leitura offline pode mostrar um
        resumo previamente consultado nesta sessão do navegador; sair da conta
        apaga esse resumo. Fotos não são armazenadas para leitura offline. Evite
        deixar sua sessão aberta em dispositivo compartilhado.
      </p>
      <h2>Exportação e exclusão</h2>
      <p>
        Em Minha conta, você pode baixar seus registros e solicitar exclusão. A
        solicitação bloqueia imediatamente o acesso, inclusive a projetos
        encerrados. Os arquivos e a conta são removidos por processamento
        seguro. Cópias de segurança, quando configuradas pelo responsável pela
        instalação, precisam respeitar a exclusão e não podem recolocar seus
        dados em uso.
      </p>
      <h2>Responsável e publicação</h2>
      <p>
        Esta versão destina-se à instalação e ao uso pessoal do proprietário.
        Antes de disponibilizar o Diazen a outras pessoas, o responsável deverá
        publicar seu contato, definir os operadores e a retenção das cópias, e
        revisar a base legal e esta política. A configuração atual pode ser
        consultada com o responsável pela instalação.
      </p>
      <p className="muted">
        Versão informativa atualizada em 25/10/2026. A revisão jurídica e
        operacional da instalação real é uma etapa anterior à publicação para
        terceiros.
      </p>
    </article>
  );
}
