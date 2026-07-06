
export const getBaseEmailTemplate = (content: string, title: string, buttonText?: string, buttonUrl?: string) => {
  const primaryColor = "#22c55e";
  const logoUrl = "https://www.xn--etxgesto-xza.com.br/ETX-GESTAO-4.png";

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: 'Geist', sans-serif; background-color: #f9fafb; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background-color: ${primaryColor}; padding: 32px; text-align: center; }
        .header img { height: 48px; }
        .content { padding: 40px; color: #1f2937; line-height: 1.6; }
        .content h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #111827; }
        .content p { margin-bottom: 16px; font-size: 16px; }
        .footer { padding: 24px; text-align: center; font-size: 14px; color: #6b7280; background-color: #f3f4f6; }
        .button { display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px; transition: background-color 0.2s; }
        .highlight { font-weight: 700; color: ${primaryColor}; }
        .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0; }
        .card-title { font-weight: 600; margin-bottom: 8px; display: block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="ETX Gestão">
        </div>
        <div class="content">
          ${content}
          ${buttonText && buttonUrl ? `
            <div style="text-align: center;">
              <a href="${buttonUrl}" class="button">${buttonText}</a>
            </div>
          ` : ''}
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ETX Gestão. Todos os direitos reservados.<br>
          Esta é uma notificação automática do sistema.
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getExpirationEmailHtml = (data: {
  adminName: string;
  days: number;
  expiringItems: { employeeName: string; documentType: string; expiresAt: string }[];
  baseUrl: string;
}) => {
  const itemsHtml = data.expiringItems.map(item => `
    <div class="card">
      <span class="card-title">${item.employeeName}</span>
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        Documento: <span class="highlight">${item.documentType}</span><br>
        Vencimento: <strong>${item.expiresAt}</strong>
      </p>
    </div>
  `).join('');

  const title = data.days === 0 ? "⚠️ Documentos Vencendo HOJE" : `Aviso: Documentos vencendo em ${data.days} dias`;
  const content = `
    <h1>Olá, ${data.adminName}!</h1>
    <p>Gostaríamos de avisar que existem documentos que precisam de atenção. Abaixo estão os funcionários com documentos vencendo em <span class="highlight">${data.days === 0 ? 'HOJE' : `próximos ${data.days} dias`}</span>:</p>
    ${itemsHtml}
    <p>Por favor, acesse o sistema para gerenciar esses documentos e garantir a conformidade da sua empresa.</p>
  `;

  return getBaseEmailTemplate(content, title, "Gerenciar Funcionários", `${data.baseUrl}/employees`);
};

export const getNewEmployeeEmailHtml = (data: {
  adminName: string;
  employeeName: string;
  position: string;
  baseUrl: string;
}) => {
  const title = "Novo Funcionário Adicionado";
  const content = `
    <h1>Olá, ${data.adminName}!</h1>
    <p>Um novo funcionário foi cadastrado com sucesso no sistema.</p>
    <div class="card">
      <span class="card-title">${data.employeeName}</span>
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        Cargo: <span class="highlight">${data.position}</span>
      </p>
    </div>
    <p>Você pode visualizar o perfil completo e os documentos do novo funcionário clicando no botão abaixo.</p>
  `;

  return getBaseEmailTemplate(content, title, "Ver Funcionário", `${data.baseUrl}/employees`);
};

export const getImportCompletionEmailHtml = (data: {
  adminName: string;
  fileName: string;
  totalFound: number;
  totalCreated: number;
  totalFailed: number;
  baseUrl: string;
}) => {
  const title = "Importação em Massa Concluída";
  const hasErrors = data.totalFailed > 0;
  
  const content = `
    <h1>Olá, ${data.adminName}!</h1>
    <p>O processamento da sua planilha de importação de funcionários foi concluído.</p>
    <div class="card">
      <span class="card-title">Resumo da Importação</span>
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        Arquivo: <strong>${data.fileName}</strong><br>
        Total encontrado: <strong>${data.totalFound}</strong><br>
        Criados com sucesso: <span class="highlight" style="color: #22c55e;">${data.totalCreated}</span><br>
        Falhas de validação: <span class="highlight" style="color: #ef4444;">${data.totalFailed}</span>
      </p>
    </div>
    ${hasErrors ? `
      <p style="color: #ef4444; font-weight: 600;">⚠️ Atenção: Algumas linhas continham erros e não puderam ser importadas. Você pode corrigir estes funcionários diretamente no painel.</p>
    ` : '<p>Todos os funcionários foram importados com sucesso!</p>'}
    <p>Acesse o painel de Criação em Massa para visualizar e gerenciar os detalhes.</p>
  `;

  return getBaseEmailTemplate(content, title, "Visualizar Importação", `${data.baseUrl}/employees/mass-creation`);
};

export const getWelcomeEmailHtml = (data: {
  userName: string;
  tempPassword?: string;
  baseUrl: string;
}) => {
  const title = "Bem-vindo ao ETX Gestão";
  const content = `
    <h1>Olá, ${data.userName}!</h1>
    <p>Sua conta de acesso ao **ETX Gestão** foi criada com sucesso pelo administrador da sua empresa.</p>
    <p>Abaixo estão as suas credenciais de acesso para a plataforma:</p>
    <div class="card">
      <span class="card-title">Acesso à Plataforma</span>
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        Link: <strong>${data.baseUrl}/login</strong><br>
        ${data.tempPassword ? `Senha Temporária: <strong>${data.tempPassword}</strong>` : ''}
      </p>
    </div>
    <p>Recomendamos alterar sua senha no primeiro acesso através da aba de "Configurações" para garantir a segurança da sua conta.</p>
  `;

  return getBaseEmailTemplate(content, title, "Acessar Plataforma", `${data.baseUrl}/login`);
};

export const getPassportEmissionEmailHtml = (data: {
  adminName: string;
  employeeName: string;
  baseUrl: string;
}) => {
  const title = "Passaporte de Segurança Emitido";
  const content = `
    <h1>Olá, ${data.adminName}!</h1>
    <p>Gostaríamos de notificar que o **Passaporte de Segurança do Trabalho** do funcionário listado abaixo foi gerado com sucesso:</p>
    <div class="card">
      <span class="card-title">${data.employeeName}</span>
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        Status: <span class="highlight" style="color: #22c55e;">Documento Emitido</span><br>
        Data de Emissão: <strong>${new Date().toLocaleDateString('pt-BR')}</strong>
      </p>
    </div>
    <p>O Passaporte consolida a conformidade de todos os exames médicos (ASO) e treinamentos de normas regulamentadoras (NRs) do trabalhador, habilitando-o a atuar nas frentes de trabalho.</p>
    <p>Você pode visualizar o perfil completo do funcionário clicando no botão abaixo.</p>
  `;

  return getBaseEmailTemplate(content, title, "Visualizar Funcionário", `${data.baseUrl}/employees`);
};
