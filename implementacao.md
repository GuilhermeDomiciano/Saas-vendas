# Plano de Implementação — POC Sales Prospecting AI

## Decisões de Design

- **Múltiplas conversas por lead** — o vendedor pode tentar estratégias diferentes; `GET /conversations?leadId=` retorna lista
- **Score recalculado ao atualizar notes** — não só na criação
- **WhatsApp link sem `?text=`** — gerado como `https://wa.me/55{phone}`; o frontend monta o link com a mensagem da IA na hora de copiar/enviar
- **Limite de histórico na LLM** — AIService envia no máximo as últimas 20 mensagens para não estourar tokens
- **Histórico como mensagens alternadas** — usar roles `assistant`/`user` na API em vez de serializar tudo num texto só (melhor qualidade de resposta)
- **Status validado por enum** — DTO valida contra valores permitidos (`prospecting`, `contacted`, `negotiating`, `won`, `lost`)
- **Pipeline é global** — rota `/pipeline` mostra todos os leads, não `/leads/:id/pipeline`
- **Página de detalhe do lead** — `/leads/:id` mostra dados, score, link WhatsApp, atalho pro chat e edição

---

## Fase 1 — Infraestrutura Base

- [x] Criar `docker-compose.yml` na raiz com serviço PostgreSQL
- [x] Criar projeto NestJS em `/backend`
- [x] Configurar `.env` no backend (`DATABASE_URL`, `FUSION_TOKEN`, `PORT`, `FUSION_ENDPOINT`, `FUSION_DEPLOYMENT`, `FUSION_API_VERSION`)
- [x] Configurar TypeORM no `AppModule` (conexão com PostgreSQL, `synchronize: true`)
- [x] Habilitar CORS no `main.ts` para `http://localhost:5173`
- [x] Criar projeto Vite + React + TypeScript em `/frontend`
- [x] Criar `run.sh` que aguarda o banco estar pronto antes de subir o backend
- [x] Criar `.env.example` commitável com as variáveis necessárias (sem valores sensíveis)

---

## Fase 2 — Backend: LeadsModule

- [x] Criar entidade `Lead` com todos os campos definidos no context.md
- [x] Criar enum `LeadStatus` (`prospecting`, `contacted`, `negotiating`, `won`, `lost`)
- [x] Criar `CreateLeadDto` e `UpdateLeadDto` com `class-validator` (status validado por enum)
- [x] Implementar lógica de cálculo do `potentialScore` baseado nos `notes` (executar no create e no update)
- [x] Implementar geração automática do `whatsappLink` ao salvar lead com telefone (`https://wa.me/55{phone}`, sem `?text=`)
- [x] Implementar endpoints:
  - [x] `GET /leads` com filtro por status
  - [x] `POST /leads`
  - [x] `PUT /leads/:id`
  - [x] `DELETE /leads/:id`
- [x] Implementar `POST /leads/import` com `multer` + `csv-parser`

---

## Fase 3 — Backend: ConversationsModule (estrutura)

- [x] Criar entidade `Conversation` com relação `ManyToOne` para `Lead` e campo `messages` JSONB
- [x] Implementar endpoints básicos:
  - [x] `POST /conversations` — inicia conversa (recebe `leadId` + `strategy`)
  - [x] `GET /conversations?leadId=` — lista conversas de um lead
  - [x] `POST /conversations/:id/reply` — registra resposta do cliente

---

## Fase 4 — Backend: AIModule + Integração

- [x] Criar `AIService` com cliente HTTP para Fusion LLM (axios)
- [x] Definir os 3 system prompts das estratégias (`consultative`, `urgency`, `social_proof`)
- [x] Implementar `generateFirstMessage(lead, strategy)` — histórico como mensagens alternadas (assistant/user)
- [x] Implementar `generateReply(conversation, clientMessage)` — limitar a últimas 20 mensagens do histórico
- [x] Plugar AIService nos endpoints de Conversations

---

## Fase 5 — Seed de Dados

- [x] Criar seed com 5 leads de exemplo
- [x] Incluir 1 conversa de exemplo com histórico (para testar frontend do chat sem depender da IA)

---

## Fase 6 — Frontend: Configuração Base

- [x] Configurar `axios` com `baseURL` apontando para `http://localhost:3000`
- [x] Criar camada de serviços (`/services`) para leads e conversations
- [x] Configurar roteamento com `react-router-dom` para as 4 páginas (`/leads`, `/leads/:id`, `/pipeline`, `/leads/:id/chat`)

---

## Fase 7 — Frontend: Página `/leads`

- [x] Tabela de leads com colunas: Nome, Segmento, Cidade, Status, Score, Ações
- [x] Filtro por status no topo
- [x] Modal com formulário para criar novo lead
- [x] Upload de CSV com botão "Importar CSV"
- [x] Cada linha: link para detalhe do lead + ícone WhatsApp
- [x] Loading state e tratamento de erros

---

## Fase 8 — Frontend: Página `/leads/:id` (Detalhe do Lead)

- [x] Exibir dados completos do lead (nome, segmento, cidade, phone, notes, score)
- [x] Botão editar (inline ou modal)
- [x] Link WhatsApp
- [x] Botão "Ir para Chat" → navega para `/leads/:id/chat`
- [x] Lista de conversas existentes desse lead

---

## Fase 9 — Frontend: Página `/pipeline`

- [x] Instalar e configurar `@dnd-kit/core`
- [x] Board Kanban com 5 colunas: Prospecção → Contato feito → Em negociação → Fechado → Perdido
- [x] Cards de todos os leads, arrastáveis entre colunas
- [x] Ao soltar o card, chamar `PUT /leads/:id` para atualizar status
- [x] Clicar no card navega para `/leads/:id`

---

## Fase 10 — Frontend: Página `/leads/:id/chat`

- [x] Seletor de estratégia no topo (Consultivo / Urgência / Prova Social)
- [x] Botão "Gerar 1ª mensagem" chamando `POST /conversations`
- [x] Exibição de mensagens em balões estilo WhatsApp (AI à esquerda, cliente à direita)
- [x] Campo de texto para colar resposta do cliente
- [x] Botão "Gerar resposta" chamando `POST /conversations/:id/reply`
- [x] Botão de copiar mensagem da IA
- [x] Seletor de conversa (caso o lead tenha múltiplas)
- [x] Loading state durante chamadas à IA e tratamento de erros amigável
