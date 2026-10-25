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
      <h2>Integração pessoal com Garmin</h2>
      <p>
        A Garmin Personal API fica disponível exclusivamente à conta Diazen do
        proprietário configurado no servidor. A chave pessoal e os tokens não
        são enviados ao navegador. Consultamos atividades sincronizadas com o
        Garmin Connect, com título, tipo, data, duração, distância e calorias
        disponíveis, sem solicitar mapas, fotografias ou outras métricas de
        saúde.
      </p>
      <p>
        Você pode escolher atividades anteriores para importar. Com a importação
        automática ativada, novas atividades realizadas após a ativação são
        salvas no projeto ativo, respeitando sua vigência. A verificação ocorre
        ao abrir o aplicativo e periodicamente em segundo plano. Você pode
        pausar a importação automática em Atividades. Consultas repetidas não
        duplicam registros nem sobrescrevem os dados que você revisou no diário.
      </p>
      <p>
        Atividades importadas e suas referências passam a fazer parte do banco,
        do histórico, da exportação e das cópias de segurança do Diazen. Ao
        excluir uma atividade importada, mantemos seu identificador de origem
        para não recriá-la automaticamente. Esses dados pertencem somente à sua
        conta e são removidos no procedimento de exclusão da conta. Nenhuma
        dessas ações modifica suas atividades originais na Garmin.
      </p>
      <p>
        A prévia da consulta pode ser reaproveitada na memória do servidor por
        até um minuto e permanece na memória da tela por até quinze minutos, sem
        acesso offline. Limpar a consulta remove essa prévia, preservando
        registros já importados. O agendador usa um segredo próprio armazenado
        de forma cifrada no Supabase Vault; a chave Garmin permanece somente na
        configuração privada do servidor. Você pode revogar o acesso excluindo
        sua chave pessoal no Garmin Connect. A exclusão da conta Diazen bloqueia
        novas sincronizações.
      </p>
      <h2>Dispositivo e conexão</h2>
      <p>
        A instalação usa cookies de sessão. A leitura offline pode mostrar um
        resumo previamente consultado nesta sessão do navegador; sair da conta
        apaga esse resumo. Uma preferência visual guarda apenas se a
        apresentação da Garmin já foi vista, para recolher essa seção nas
        próximas visitas; ela não contém atividades ou credenciais. Fotos não
        são armazenadas para leitura offline. Evite deixar sua sessão aberta em
        dispositivo compartilhado.
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
