export const DOCUMENTS_PT_BR: Record<string, string> = {
    ASO: "Atestado de Saúde Ocupacional",
    RG_CNH: "RG ou CNH",
    CTPS_ESOCIAL: "Carteira de Trabalho (CTPS) / eSocial",
    OS_NR01: "Ordem de Serviço - NR 01",
    VACCINE_CARD: "Carteira de Vacinação",
    LIFE_INSURANCE_208: "Seguro de Vida (NR-01 / 208)",
    REGISTRATION_FORM: "Ficha de Registro do Funcionário",
    NR01_TRAINING: "Treinamento NR-01",
    NR06_EPI_TRAINING: "Treinamento de EPI - NR-06",
    FIRST_AID_TRAINING_208: "Treinamento de Primeiros Socorros (208)",
    EPI_FORM_208: "Ficha de EPI (208)",
    FIRE_FIGHTING_TRAINING_208: "Treinamento de Combate a Incêndio (208)",
}

export const TRAININGS_PT_BR: Record<string, string> = {
    NR10_SEGURANCA_ELETRICIDADE_40H: "NR-10 Segurança em Eletricidade 40 Horas",
    NR10_SEP_SISTEMA_ELETRICO_POTENCIA: "NR-10 SEP Sistema Elétrico de Potência",
    CARTA_ANUENCIA_SEP_208: "Carta de anuência SEP - 208",
    CNH_CARTEIRA_NACIONAL_HABILITACAO: "CNH - Carteira Nacional de Habilitação",
    TREINAMENTO_DIRECAO_DEFENSIVA_208: "Treinamento de direção defensiva - 208",
    CURSO_MANUSEIO_EMERGENCIAS_QUIMICAS: "Curso para manuseio e atendimento a emergências químicas",
    CARTA_ANUENCIA_NR12_208: "Carta de anuência NR-12 - 208",
    NR12_OPERACAO_MANUTENCAO_MAQUINAS_EQUIPAMENTOS_208: "NR-12 Operação e manutenção de máquinas e equipamentos - 208",
    NR35_TRABALHO_ALTURA_RESGATE_AEROGERADORES_16H: "NR-35 Trabalho em altura + Resgate em Aerogeradores (Carga horaria 16h)",
    CARTA_ANUENCIA_NR35_208: "Carta de anuência NR-35 - 208",
    NR11_TALHA_ELETRICA_208: "NR-11 Talha elétrica - 208",
    COMPROVANTE_QUALIFICACAO: "Comprovante de qualificação (Registro do conselho de classe e ou certificados)",
    GWO_CERTIFICADO_TREINAMENTO_WINDA_208: "GWO - Certificado de Treinamento WINDA - 208",
    GWO_BST_TRABALHO_RESGATE_ALTURA_16H_208: "GWO - BST - Trabalho e Resgate em Altura - (16h) - 208",
    GWO_BST_PRIMEIROS_SOCORROS_208: "GWO - BST Primeiros Socorros - 208",
    GWO_BST_MANUSEIO_MANUAL_208: "GWO - BST - Manuseio Manual - 208",
    GWO_BST_COMBATE_INCENDIO_208: "GWO - BST - Combate a Incêndio - 208",
    ADVANCED_RESCUE_TRAINING_ART: "Advanced Rescue Training (ART)",
}

export const getPTBRDocuments = (type: string, name?: string) => {
    if (type === "CUSTOM" && name) return name
    return DOCUMENTS_PT_BR[type] || TRAININGS_PT_BR[type] || type.replaceAll("_", " ")
}
