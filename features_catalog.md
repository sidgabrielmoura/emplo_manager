# Catálogo Exaustivo de Funcionalidades — Portal do Personal Trainer (AtlasFit)

Este documento apresenta o mapeamento completo e de alto nível de todas as funcionalidades disponíveis para o Personal Trainer (Professor) no portal **AtlasFit**. Ele serve de guia técnico e comercial para demonstração a clientes e validação dos fluxos em produção.

---

## 1. Autenticação, Acesso e Gestão de Contas
- **Registro e Login Seguro**: Acesso via formulário estruturado de credenciais protegido por criptografia e integrado ao ecossistema `NextAuth`.
- **Portal de Seleção de Workspace**: O portal suporta arquitetura multi-inquilino (*multi-tenant*). Se o professor gerenciar mais de uma assessoria (ex: "AtlasFit Academy" e "CP Treinamento"), ele visualiza um painel inicial exclusivo para selecionar em qual workspace deseja entrar.
- **Alternância Instantânea**: Menu na barra lateral para trocar de workspace em tempo real sem precisar efetuar logout.

---

## 2. Captação Pública de Alunos (`/t/[slug]`)
- **Página de Vendas Customizada**: Cada workspace possui um link de captação pública exclusivo (ex: `/t/atlasfit`) que exibe de forma elegante a marca do professor (Nome, Slogan, Logotipo e a Cor de Marca principal injetada dinamicamente).
- **Formulário de Pré-Cadastro**: Alunos interessados podem preencher seus dados (Nome completo, WhatsApp, E-mail, Senha e escolha do plano financeiro de interesse).
- **Fila de Aprovação (Segurança)**: Após se cadastrarem, os alunos não entram direto no portal; eles são direcionados para uma página de aprovação pendente ("Fase de Análise"), aguardando a liberação explícita do professor.

---

## 3. Painel do Professor (Dashboard Geral — `/personal/dashboard`)
- **Saudação Contextual**: Mensagem inteligente que se adapta ao horário do dia ("Bom dia", "Boa tarde" ou "Boa noite") integrada com o nome de exibição do usuário.
- **Indicadores Chave de Performance (KPI Cards)**:
  - **Alunos Ativos**: Total de alunos matriculados com crescimento percentual comparativo.
  - **Risco de Churn (Inatividade)**: Quantidade de alunos inativos há mais de 10 dias com alertas de risco.
  - **Faturamento Mensal (MRR)**: Receita Recorrente Mensal calculada dinamicamente com base nas mensalidades pagas no mês corrente.
  - **Ticket Médio**: Média gasta por aluno nos planos vigentes.
  - **Taxa de Conclusão**: Média de aderência dos treinos prescritos concluídos.
- **Evolução da Receita (Área Comparativa)**: Gráfico de área dinâmico (`Recharts Area Chart`) mostrando o faturamento dos últimos 6 meses, comparando a receita do período atual com o período anterior.
- **Distribuição de Planos**: Gráfico de barras horizontais indicando a quantidade de alunos matriculados em cada plano (Mensal, Trimestral, Semestral, Anual) e a receita gerada em tempo real por cada modalidade.
- **Top Alunos da Semana (Ranking)**: Tabela de engajamento que lista os alunos com maior constância, ordenados por número de treinos concluídos na semana e dias seguidos de constância (*streak*).
- **Alunos Inativos (Ausentes)**: Caixa de controle que sinaliza alunos que não treinam há dias, classificando o risco em **Alto (Vermelho)**, **Médio (Amarelo)** ou **Baixo (Verde)** para facilitar intervenções preventivas.
- **Evolução de Cargas**: Gráfico de linhas (`Line Chart`) que ilustra a progressão da carga média movimentada por todos os alunos nas últimas 8 semanas versus um benchmark de desempenho.
- **Percepção de Esforço (Esforço de Treino)**: Gráfico de pizza circular (`Pie Chart`) demonstrando o feedback subjetivo de esforço fornecido pelos alunos após os treinos (Muito Fácil, Fácil, Adequado, Difícil, Muito Difícil).
- **Histórico de Recordes Pessoais (PRs)**: Timeline contendo os últimos recordes de peso superados pelos alunos nos exercícios.
- **Frequência Semanal**: Gráfico de barras verticais medindo a quantidade consolidada de treinos realizados por dia da semana (Segunda a Domingo).
- **Consistência de Aderência**: Gráfico circular medindo a porcentagem geral de constância dos alunos, acompanhado da evolução média de massa e frequência semanal média.
- **Feed de Atividades Recentes**: Timeline dinâmica que puxa do banco de dados as últimas 5 ações do portal em tempo real (ex: "Mariana Costa completou treino de pernas", "Thiago Oliveira bateu PR no agachamento", etc.).

---

## 4. Gestão de Alunos (`/personal/clients`)
- **Painel Geral de Alunos**: Listagem completa de todos os alunos ativos e inativos com foto, plano contratado, WhatsApp e status.
- **Filtro Instantâneo por Texto**: Campo de busca rápida que filtra alunos na hora por nome ou telefone.
- **Chamada Direta no WhatsApp**: Botão rápido que abre o chat do WhatsApp Web ou WhatsApp App com o número do aluno configurado em um clique.
- **Gestão de Alunos Pendentes**: Aba exclusiva que mostra os cadastros captados no link público do professor. O professor pode analisar a lista e escolher entre **Aprovar** (o aluno ganha acesso imediato ao portal do aluno) ou **Recusar** (exclusão permanente).

---

## 5. Prontuário e Perfil Individual do Aluno (`/personal/clients/[id]`)
Ao abrir a ficha do aluno, o professor tem acesso a cinco abas de controle de alto padrão:

### A. Aba Treinos
- **Agenda Semanal de Treinos**: Calendário de Segunda a Domingo para prescrição focada.
- **Prescrição Personalizada**: Botão para criar e editar planilhas de treino. O professor escolhe o grupo muscular, seleciona o exercício e define séries, repetições, carga inicial, tempo de descanso e observações de execução.
- **Biblioteca de Demonstração**: Ao clicar em um exercício, abre-se um modal premium com instruções textuais detalhadas e a reprodução de um vídeo demonstrativo do YouTube integrado.
- **Aplicação de Templates**: Botão rápido para clonar um modelo de treino completo pré-configurado da biblioteca geral para este aluno.
- **Alternância de Status de Treino**: Botão para ativar, desativar ou suspender treinos prescritos.

### B. Aba Progresso (Avaliação de Medidas e Fotos)
- **Gráficos de Composição Corporal**: Histórico de Peso (kg) e Percentual de Gordura (BF%) exibidos em gráficos dinâmicos de linha.
- **Tabela Histórica de Perímetros**: Painel com todas as aferições de circunferência física (Braço Direito/Esquerdo, Antebraço Direito/Esquerdo, Peito, Cintura, Abdômen, Quadril, Coxa Direita/Esquerda, Panturrilha Direita/Esquerda) organizadas por data.
- **Galeria de Fotos de Acompanhamento**: Linha do tempo visual com fotos de frente, costas e lado enviadas pelo aluno.
- **Interação Social (Likes e Comentários)**: O professor pode curtir (like com animação) as fotos de progresso e adicionar comentários clínicos ou de incentivo em cada imagem. As fotos abrem em um visualizador ampliado (*Lightbox*).

### C. Aba Avaliações Físicas (Totalmente Integrada ao Banco de Dados)
- **Registro de Avaliações Físicas e Clínicas**: Criação de novas avaliações no banco com suporte a dois métodos principais:
  - **Dobra Cutânea (Pollock 7 Dobras)**: Formulário completo para registrar medidas de dobras cutâneas em milímetros (Tríceps, Subescapular, Suprailíaca, Abdominal, Peitoral, Axilar Média, Coxa).
  - **Bioimpedância**: Registro de medição por balança de bioimpedância (InBody/Omron), controlando peso, altura, percentual de gordura e massa magra.
- **Campo de Anamnese e Notas Clínicas**: Caixa de texto rica para registrar observações gerais sobre lesões, restrições, histórico familiar e objetivos.
- **Histórico Consolidado**: Linha do tempo de todas as avaliações já feitas com data e tipo, com opção de visualização detalhada em modal ou exclusão segura protegida por confirmação de segurança.

### D. Aba Financeiro Individual (Totalmente Integrada ao Banco de Dados)
- **Resumo Financeiro do Aluno**: Cartões KPI individuais com o total Pago (recebido), Pendente e Atrasado deste aluno específico.
- **Lançamento Manual de Cobrança**: Botão para registrar mensalidades recebidas ou em aberto (definindo Plano, Valor em R$, Status, Método de Pagamento e Data de Vencimento/Competência).
- **Lista de Histórico de Cobrança**: Visualização executiva de todas as parcelas do aluno com indicação colorida de status de pagamento (Pago = Verde, Pendente = Amarelo, Atrasado = Vermelho) e métodos correspondentes (PIX, Boleto, Cartão de Crédito).

### E. Aba Central de Arquivos (Totalmente Integrada ao Banco de Dados)
- **Compartilhamento de Arquivos Locais**: Upload seguro de documentos PDFs, imagens ou Word compartilhados com o aluno (Exames de Sangue, Laudos Médicos, Avaliações Posturais).
- **Zona de Upload Inteligente (Dropzone)**: Componente interativo de arrastar e soltar arquivos com carregamento visual contextual, barra de progresso em tempo real e mensagem de envio ("Enviando...").
- **Compartilhamento de Links em Nuvem**: Opção para adicionar links externos úteis ao aluno (ex: planilha de cargas online do Google Sheets, pasta compartilhada de fotos no Google Drive).
- **Filtros e Busca de Arquivos**: Campo de busca textual e cartões de filtro de categoria rápidos (Exames e Laudos, Planos e Treinos, Outros).
- **Interface Híbrida Mobile-First**: Desktop exibe uma tabela detalhada com tamanho de arquivo e data; Mobile exibe cards premium com halos coloridos estilizados por categoria e layout seguro contra quebras.
- **Exclusão com Diálogo de Segurança**: Remoção de arquivos protegida por confirmação explícita (`AlertDialog`) para evitar exclusões acidentais.

---

## 6. Biblioteca de Treinos e Modelos (`/personal/workouts`)
- **Templates de Treino**: O professor pode criar planilhas de treino modelo reutilizáveis (ex: "Hipertrofia Iniciante", "Fullbody HIIT"). Esses modelos podem ser aplicados em lote ou individualmente a qualquer novo aluno, poupando horas de trabalho manual.
- **Biblioteca Geral de Exercícios**: Lista de exercícios integrados divididos por grupos musculares (Peito, Costas, Pernas, Ombros, Bíceps, Tríceps, Core).
- **Ajustes de Exercício (Suporte Interativo)**: Canal de comunicação direta onde o aluno pode solicitar alterações de exercícios (ex: "Sinto dor no joelho ao fazer afundo"). O professor recebe a notificação, abre um chat interno interativo com o aluno para alinhar e pode resolver a solicitação alterando o exercício diretamente na ficha dele.

---

## 7. Agenda de Tarefas e Calendário (`/personal/calendar`)
- **Calendário Mensal/Semanal**: Painel com grade de dias indicando compromissos agendados.
- **Agenda do Dia**: Linha do tempo diária mostrando tarefas importantes programadas de forma automática ou manual, divididas em categorias claras:
  - **Avaliação Física**: Avaliações marcadas para o dia.
  - **Financeiro**: Vencimentos de planos e cobranças de mensalidades.
  - **Check-in**: Coleta de fotos e evolução programada de alunos.
  - **Lembrete**: Tarefas gerais criadas pelo professor (ex: "Montar treino do João").

---

## 8. Gestão Financeira Consolidada (`/personal/finance`)
- **Caixa de Entrada Geral (Painel do Workspace)**:
  - **MRR (Faturamento Estimado)**: Receita total consolidada recorrente.
  - **Inadimplência (Churn Financeiro)**: Porcentagem de mensalidades com vencimento atrasado.
  - **Ticket Médio**: Valor médio arrecadado por transação de aluno.
  - **Planos Ativos**: Total de inscrições ativas no workspace.
- **Gerenciamento de Planos**: Cadastro de planos de consultoria do professor (ex: "Consultoria Mensal", "Assessoria Premium Trimestral").
  - Define o preço em reais e o intervalo de recorrência (Mensal, Trimestral, Semestral, Anual).
  - Campo opcional para inserir link direto de pagamento externo (Stripe, MercadoPago, Hotmart, Eduzz).
- **Histórico Global de Transações**: Tabela consolidada com todas as mensalidades e parcelas cobradas de todos os alunos do workspace, com indicação colorida de status de pagamento, valores e datas, facilitando a conciliação financeira mensal.

---

## 9. Organização Inteligente e Alertas (`/personal/organization`)
- **Central de Alertas Críticos**: Listagem automatizada gerada pelo sistema para notificar o professor sobre eventos que necessitam de atenção imediata:
  - Alunos ausentes sem treinar há mais de 7 dias.
  - Quedas abruptas de constância na semana.
  - Solicitações de ajustes de treinos pendentes.
- **Lista Prioritária de Intervenção**: Algoritmo visual que exibe alunos ordenados por prioridade de urgência de contato (Alta, Média, Baixa) com base em seu engajamento recente no aplicativo, priorizando o acolhimento preventivo de clientes em risco de cancelamento.

---

## 10. Customização de Marca e Branding (`/personal/settings`)
- **Customização Completa White-Label**:
  - Definição do Nome da Assessoria do Personal Trainer.
  - Configuração de Slogan comercial exclusivo exibido nas landing pages.
  - Carregamento de logotipo próprio.
- **Injeção de Cores Dinâmicas (Dynamic Branding)**: O professor pode definir uma cor principal para o seu workspace utilizando um seletor visual de cores. A cor é salva no banco de dados e injetada via variável de CSS global (`--primary`). Todos os botões, links, abas selecionadas, loaders e skeletons da interface inteira (tanto na área do Personal quanto na área do Aluno) mudam automaticamente de cor na hora para refletir a marca dele!

---

## 11. Assinatura do Plano AtlasFit (`/personal/subscription`)
- **Plano de Assinatura do Professor**: Visualização do plano assinado pelo professor para uso da plataforma AtlasFit (Basic, Pro ou Elite).
- **Uso de Recursos**: Barra de progresso visual de uso dos recursos contratados:
  - Limite de Alunos Ativos (ex: 18 de 20 alunos permitidos).
  - Limite de Espaço de Armazenamento de Arquivos na Nuvem (ex: 2.5 GB de 5 GB contratados).
- **Histórico de Faturas**: Tabela com todos os pagamentos da assinatura efetuados pelo professor para a plataforma.
