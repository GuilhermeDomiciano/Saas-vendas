import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Lead } from '../leads/lead.entity';
import { Conversation, Message } from '../conversations/conversation.entity';

// ---------------------------------------------------------------------------
// Sales Expert Skill — carregado em runtime para que edições nos .md
// reflitam sem recompilar (apenas reiniciar o servidor)
// ---------------------------------------------------------------------------
const SKILL_DIR = path.join(__dirname, 'sales-expert');

function loadSkill(file: string): string {
  try {
    return fs.readFileSync(path.join(SKILL_DIR, file), 'utf-8');
  } catch {
    return '';
  }
}

const SKILL_BASE = loadSkill('SKILL.md');
const SKILL_CLOSINGS = loadSkill('references/closings.md');
const SKILL_OBJECTIONS = loadSkill('references/objections.md');
const SKILL_TECH = loadSkill('references/tech-sals.md');

// ---------------------------------------------------------------------------
// Keywords que identificam segmento tech/SaaS
// ---------------------------------------------------------------------------
const TECH_KEYWORDS = [
  'tech', 'saas', 'software', 'sistema', 'app', 'aplicativo',
  'digital', 'ti', 'tecnologia',
];

function isTechSegment(segment: string | null | undefined): boolean {
  if (!segment) return false;
  const lower = segment.toLowerCase();
  return TECH_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Prompts por estratégia (instruções específicas de cada abordagem)
// ---------------------------------------------------------------------------
const STRATEGY_INSTRUCTIONS: Record<string, string> = {
  consultative: `## Estratégia: Consultiva (SPIN Selling)
Sua abordagem é educativa e empática — você não vende, você ajuda o cliente a enxergar o problema primeiro.
- Comece identificando o problema específico daquela empresa (sem site, avaliações ruins, etc.)
- Faça perguntas abertas para entender a realidade do cliente antes de apresentar soluções
- Use linguagem simples, sem jargões técnicos
- Mostre o impacto do problema em reais: "clientes que te procuram no Maps e não encontram site, desistem"
- Só ofereça o produto depois de criar consciência do problema
- Tom: amigável, paciente, consultivo`,

  urgency: `## Estratégia: Urgência (Challenger Sale + AIDA)
Sua abordagem destaca o custo de não agir — cada dia sem presença digital é dinheiro deixado na mesa.
- Abra com um dado ou observação impactante sobre o negócio do cliente
- Demonstre o custo de oportunidade de não agir agora
- Use comparação com concorrentes quando relevante: "seus concorrentes na região já têm site"
- Crie urgência legítima (não falsa escassez): tendências do mercado, comportamento do consumidor
- Ofereça uma solução clara com prazo definido de entrega
- Tom: direto, confiante, orientado a resultado`,

  social_proof: `## Estratégia: Prova Social (Hook-Story-Offer de Hormozi)
Sua abordagem é baseada em histórias de sucesso de clientes similares.
- Abra conectando o negócio do cliente com uma história de sucesso de segmento similar
- Use resultados concretos: "uma clínica parecida com a sua começou a receber 30% mais agendamentos"
- Posicione o produto como algo que já foi testado e validado, não uma aposta
- Reduza o risco percebido: mencione garantia, prazo, simplicidade do processo
- Convide para ver exemplos ou cases reais
- Tom: entusiasmado mas credível, baseado em evidências`,
};

// ---------------------------------------------------------------------------
// Extrai as seções Core Sales Frameworks e Execution Rules do SKILL.md
// ---------------------------------------------------------------------------
function extractSkillCore(skillMd: string): string {
  const frameworksMatch = skillMd.match(
    /## Core Sales Frameworks[\s\S]*?(?=^## (?!Core|Execution)|\Z)/m,
  );
  const rulesMatch = skillMd.match(/## Execution Rules[\s\S]*?(?=^## |\Z)/m);

  const parts: string[] = [];
  if (frameworksMatch) parts.push(frameworksMatch[0].trim());
  if (rulesMatch) parts.push(rulesMatch[0].trim());

  // Fallback: se as regexes falharem, usa o arquivo completo
  return parts.length > 0 ? parts.join('\n\n') : skillMd;
}

const SKILL_CORE = extractSkillCore(SKILL_BASE);

// ---------------------------------------------------------------------------
// Monta o system prompt completo dependendo do contexto
// ---------------------------------------------------------------------------
function buildPrompt(
  strategy: string,
  isTech: boolean,
  isReply: boolean,
  summary?: string | null,
  clientProfile?: string | null,
): string {
  const strategyInstructions =
    STRATEGY_INSTRUCTIONS[strategy] ?? STRATEGY_INSTRUCTIONS.consultative;

  const sections: string[] = [
    '# Sales Expert — Instruções Operacionais\n\n' + SKILL_CORE,
    strategyInstructions,
  ];

  if (clientProfile) {
    sections.push(
      `# Perfil de Comunicação do Cliente\n\nAdapte seu estilo ao perfil detectado abaixo. Espelhe naturalmente a formalidade, o comprimento e o tom do cliente — sem explicitar que está fazendo isso.\n\n${clientProfile}`,
    );
  }

  if (isReply) {
    if (SKILL_CLOSINGS) {
      sections.push('# Técnicas de Fechamento Disponíveis\n\n' + SKILL_CLOSINGS);
    }
    if (SKILL_OBJECTIONS) {
      sections.push('# Respostas a Objeções (use quando o cliente objetar)\n\n' + SKILL_OBJECTIONS);
    }
  }

  if (isTech && SKILL_TECH) {
    sections.push('# Guia de Vendas Tech/SaaS\n\n' + SKILL_TECH);
  }

  if (summary) {
    sections.push(`# Contexto da conversa até agora\n\n${summary}`);
  }

  sections.push(`# Regras de Formato (WhatsApp)
- Mensagens curtas e naturais para WhatsApp (máximo 3 parágrafos)
- Sem introduções do tipo "Olá, sou um assistente de IA"
- Sem listas de bullet com mais de 3 itens
- Gere apenas a mensagem, sem explicações adicionais`);

  return sections.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------

const MAX_HISTORY = 20;
export const KEEP_RECENT = 6;
export const SUMMARIZE_THRESHOLD = 16;
export const PROFILE_MIN_CLIENT_MESSAGES = 3;

@Injectable()
export class AiService {
  private readonly endpoint: string;
  private readonly deployment: string;
  private readonly apiVersion: string;
  private readonly token: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = config.getOrThrow<string>('FUSION_ENDPOINT');
    this.deployment = config.getOrThrow<string>('FUSION_DEPLOYMENT');
    this.apiVersion = config.getOrThrow<string>('FUSION_API_VERSION');
    this.token = config.getOrThrow<string>('FUSION_TOKEN');
  }

  async generateFirstMessage(lead: Lead, strategy: string): Promise<string> {
    const tech = isTechSegment(lead.segment);
    const systemPrompt = buildPrompt(strategy, tech, false);

    const userContent = `Gere a primeira mensagem de abordagem no WhatsApp para esse lead:
- Empresa: ${lead.businessName}
- Segmento: ${lead.segment ?? 'não informado'}
- Cidade: ${lead.city ?? 'não informada'}
- Problemas detectados: ${lead.notes ?? 'nenhum'}

Gere apenas a mensagem, sem explicações adicionais.`;

    return this.callLLM(systemPrompt, [{ role: 'user', content: userContent }]);
  }

  async generateReply(conv: Conversation, clientMessage: string): Promise<string> {
    const tech = isTechSegment(conv.lead?.segment);
    const systemPrompt = buildPrompt(conv.strategy, tech, true, conv.summary, conv.clientProfile);

    const rawMessages = conv.summary
      ? conv.messages.slice(-KEEP_RECENT)
      : conv.messages.slice(-MAX_HISTORY);

    const history = rawMessages.map((m: Message) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content,
    }));

    history.push({ role: 'user', content: clientMessage });

    return this.callLLM(systemPrompt, history);
  }

  needsSummarization(conv: Conversation): boolean {
    return conv.messages.length >= SUMMARIZE_THRESHOLD;
  }

  needsProfileGeneration(conv: Conversation): boolean {
    const clientMsgCount = conv.messages.filter(m => m.role === 'client').length;
    if (!conv.clientProfile && clientMsgCount >= PROFILE_MIN_CLIENT_MESSAGES) return true;
    if (conv.clientProfile && this.needsSummarization(conv)) return true;
    return false;
  }

  async generateClientProfile(
    messages: Message[],
    existingProfile: string | null,
  ): Promise<string> {
    const clientMessages = messages.filter(m => m.role === 'client');
    const clientText = clientMessages.map((m, i) => `[${i + 1}] ${m.content}`).join('\n');

    const refinement = existingProfile
      ? `Perfil anterior (para refinamento):\n${existingProfile}\n\nAtualize com base nas mensagens abaixo:\n`
      : '';

    const prompt = `Você é um analista de comunicação. Analise APENAS as mensagens do cliente abaixo e produza um perfil compacto (máximo 80 palavras) no formato:

- Formalidade: [formal | informal | muito informal]
- Comprimento: [curto | médio | longo]
- Tom emocional: [receptivo | resistente | ansioso | entusiasmado | neutro | outro]
- Nível técnico: [leigo | intermediário | especialista]
- Engajamento: [direto | evasivo | prolixo]
- Observação: [uma frase sobre padrão notável, ou "nenhuma"]

Seja direto. Sem introduções.

${refinement}Mensagens do cliente:\n${clientText}`;

    return this.callLLM(prompt, [{ role: 'user', content: 'Gere o perfil.' }]);
  }

  async generateSummary(
    messagesToSummarize: Message[],
    existingSummary: string | null,
  ): Promise<string> {
    const historyText = messagesToSummarize
      .map((m) => `${m.role === 'ai' ? 'Vendedor' : 'Cliente'}: ${m.content}`)
      .join('\n');

    const context = existingSummary
      ? `Resumo anterior:\n${existingSummary}\n\nNovas mensagens a incorporar:\n${historyText}`
      : historyText;

    const prompt = `Você é um assistente de CRM. Analise as mensagens de vendas abaixo e produza um resumo compacto (máximo 200 palavras) focado exclusivamente em informações úteis para continuar a negociação:

- Dores e problemas mencionados pelo cliente
- Objeções levantadas e como foram tratadas
- Interesse demonstrado (positivo ou negativo)
- Sinais de orçamento, prazo ou decisão
- Acordos, compromissos ou próximos passos combinados
- Tom geral do cliente (receptivo, resistente, indeciso)

Seja direto e factual. Não inclua saudações nem explicações sobre o que você está fazendo.

${context}`;

    return this.callLLM(prompt, [{ role: 'user', content: 'Gere o resumo.' }]);
  }

  private async callLLM(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;

    try {
      const response = await axios.post(
        url,
        {
          model: this.deployment,
          stream: false,
          max_completion_tokens: 1000,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.choices[0].message.content as string;
    } catch (err) {
      const msg = (err as any)?.response?.data?.error?.message ?? (err as Error).message;
      throw new InternalServerErrorException(`Erro na IA: ${msg}`);
    }
  }
}
