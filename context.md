# POC — Sales Prospecting AI Assistant

## Visão Geral

Ferramenta para vendedores autônomos que automatiza o processo de prospecção de leads (empresas sem presença digital), gerenciamento do pipeline de vendas e geração de mensagens via IA para abordagem no WhatsApp.

O vendedor cadastra ou importa leads, escolhe uma estratégia de abordagem, e a IA gera a primeira mensagem. Depois, o vendedor cola a resposta do cliente no chat e a IA responde novamente — criando um loop de conversa assistida por IA até o fechamento ou descarte.

---

## Stack

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Backend     | NestJS (Node.js + TypeScript)     |
| Frontend    | Vite + React + TypeScript         |
| Banco       | PostgreSQL via Docker Compose     |
| ORM         | TypeORM                           |
| IA          | Fusion LLM Proxy (Azure OpenAI)   |
| Modelo      | `gpt-5.4`                         |

---

## Infraestrutura Local (Docker)

Usar `docker-compose.yml` na raiz do projeto com:

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: sales
      POSTGRES_PASSWORD: sales123
      POSTGRES_DB: salesdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

O NestJS conecta via TypeORM com `synchronize: true` em desenvolvimento.

---

## Estrutura de Pastas

```
/
├── backend/          # NestJS
│   ├── src/
│   │   ├── leads/
│   │   ├── conversations/
│   │   ├── ai/
│   │   └── main.ts
│   └── .env
├── frontend/         # Vite + React
│   └── src/
│       ├── pages/
│       ├── components/
│       └── services/
└── docker-compose.yml
```

---

## Módulos do Backend

### 1. `LeadsModule`

**Entidade: `Lead`**

```ts
@Entity()
export class Lead {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() businessName: string;
  @Column({ nullable: true }) segment: string;       // ex: "clínica", "salão", "restaurante"
  @Column({ nullable: true }) city: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) googleMapsUrl: string;
  @Column({ nullable: true }) notes: string;         // problemas detectados (sem site, nota baixa, etc)
  @Column({ default: 0 }) potentialScore: number;    // 0-100
  @Column({ default: 'prospecting' }) status: string; // prospecting | contacted | negotiating | won | lost
  @Column({ nullable: true }) whatsappLink: string;  // gerado automaticamente
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

**Endpoints:**
- `GET /leads` — listar todos (com filtro por status)
- `POST /leads` — criar lead manualmente
- `PUT /leads/:id` — atualizar lead (status, notas, score)
- `DELETE /leads/:id` — remover lead
- `POST /leads/import` — importar via CSV (usar `multer` + `csv-parser`)

**Geração automática do `whatsappLink`:**
Ao salvar um lead com telefone, gerar:
```
https://wa.me/55{phone}?text={urlEncoded(mensagem padrão)}
```

**Score de potencial (`potentialScore`):**
Calcular no momento do cadastro com base nos campos preenchidos em `notes`. Usar lógica simples:
- Sem site mencionado: +40
- Avaliação ruim mencionada: +30
- Fotos fracas mencionadas: +20
- Horário incompleto: +10

---

### 2. `ConversationsModule`

**Entidade: `Conversation`**

```ts
@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Lead) lead: Lead;
  @Column() strategy: string;  // 'consultative' | 'urgency' | 'social_proof'
  @Column('jsonb') messages: Message[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

interface Message {
  role: 'ai' | 'client';
  content: string;
  timestamp: string;
}
```

**Endpoints:**
- `POST /conversations` — iniciar conversa (recebe `leadId` + `strategy`, IA gera 1ª mensagem)
- `GET /conversations/:leadId` — buscar conversa de um lead
- `POST /conversations/:id/reply` — vendedor cola resposta do cliente, IA responde

---

### 3. `AIModule`

#### Client Configuration

| Campo       | Valor                                      |
|-------------|--------------------------------------------|
| Endpoint    | `https://fusion-llm.brq.com`              |
| API Version | `2024-08-01-preview`                       |
| Deployment  | `gpt-5.4`                                  |
| Auth        | `Bearer ${FUSION_TOKEN}` (via `.env`)      |

**URL final:**
```
POST https://fusion-llm.brq.com/openai/deployments/gpt-5.4/chat/completions?api-version=2024-08-01-preview
```

**Request Body:**
```json
{
  "model": "gpt-5.4",
  "stream": false,
  "max_completion_tokens": 1000,
  "messages": [
    { "role": "system", "content": "<SYSTEM_PROMPT da estratégia>" },
    { "role": "user",   "content": "<histórico da conversa + instrução>" }
  ]
}
```

Usar `axios` ou `fetch` nativo do Node. Autenticação via header:
```
Authorization: Bearer ${process.env.FUSION_TOKEN}
```

---

#### As 3 Estratégias de Venda (System Prompts)

Cada estratégia define o comportamento completo da IA como um vendedor especialista.

---

**Estratégia 1: `consultative` — Consultor de Presença Digital**

```
Você é um consultor especializado em presença digital para pequenas empresas.
Sua abordagem é educativa e empática — você não vende, você ajuda o cliente a enxergar o problema primeiro.

Diretrizes:
- Comece identificando o problema específico daquela empresa (sem site, avaliações ruins, etc.)
- Faça perguntas abertas para entender a realidade do cliente antes de apresentar soluções
- Use linguagem simples, sem jargões técnicos
- Mostre o impacto do problema em reais: "clientes que te procuram no Maps e não encontram site, desistem"
- Só ofereça o produto depois de criar consciência do problema
- Tom: amigável, paciente, consultivo
- Mensagens curtas e naturais para WhatsApp (máx 3 parágrafos)
```

---

**Estratégia 2: `urgency` — Gerador de Urgência**

```
Você é um vendedor direto e objetivo especializado em criar senso de urgência real.
Sua abordagem destaca o custo de não agir — cada dia sem site é dinheiro deixado na mesa.

Diretrizes:
- Abra com um dado ou observação impactante sobre o negócio do cliente
- Demonstre o custo de oportunidade de não ter presença digital agora
- Use comparação com concorrentes quando relevante: "seus concorrentes na região já têm site"
- Crie urgência legítima (não falsa escassez): tendências do mercado, comportamento do consumidor
- Ofereça uma solução clara com prazo definido de entrega
- Tom: direto, confiante, orientado a resultado
- Mensagens curtas e naturais para WhatsApp (máx 3 parágrafos)
```

---

**Estratégia 3: `social_proof` — Prova Social**

```
Você é um vendedor que vende resultados, não serviços.
Sua abordagem é baseada em histórias de sucesso de clientes similares.

Diretrizes:
- Abra conectando o negócio do cliente com uma história de sucesso de segmento similar
- Use resultados concretos: "uma clínica parecida com a sua começou a receber 30% mais agendamentos"
- Posicione o produto como algo que já foi testado e validado, não uma aposta
- Reduza o risco percebido: mencione garantia, prazo, simplicidade do processo
- Convide para ver exemplos ou cases reais
- Tom: entusiasmado mas credível, baseado em evidências
- Mensagens curtas e naturais para WhatsApp (máx 3 parágrafos)
```

---

#### Lógica do `AIService`

```ts
// ai/ai.service.ts

async generateFirstMessage(lead: Lead, strategy: string): Promise<string>
// Monta o system prompt da estratégia + contexto do lead (nome, segmento, cidade, problemas detectados)
// Instrução ao modelo: "Gere a primeira mensagem de abordagem no WhatsApp para esse lead"

async generateReply(conversation: Conversation, clientMessage: string): Promise<string>
// Monta o histórico completo da conversa como contexto
// Adiciona a nova mensagem do cliente
// Instrução ao modelo: "O cliente respondeu. Continue a negociação conforme a estratégia definida."
```

O histórico é passado como parte do `content` do role `user`, serializado em texto:

```
Contexto da conversa até agora:
[AI]: <mensagem 1>
[Cliente]: <resposta 1>
[AI]: <mensagem 2>

O cliente acabou de responder:
"<nova mensagem do cliente>"

Continue a negociação seguindo a estratégia definida.
```

---

## Frontend (Vite + React)

### Páginas

#### `/leads` — Lista de Leads (view principal)
- Tabela com: Nome, Segmento, Cidade, Status, Score, Ações
- Botão "Novo Lead" (abre modal com formulário)
- Botão "Importar CSV" (upload de arquivo)
- Filtro por status no topo
- Cada linha tem: botão "Abrir Pipeline" + link direto do WhatsApp (ícone)

#### `/leads/:id/pipeline` — Pipeline Kanban
- Board com 5 colunas: `Prospecção` → `Contato feito` → `Em negociação` → `Fechado` → `Perdido`
- Card do lead arrastável entre colunas (usar `@dnd-kit/core`)
- Ao arrastar, atualiza o status via `PUT /leads/:id`

#### `/leads/:id/chat` — Chat com IA
- Seletor de estratégia no topo (Consultivo / Urgência / Prova Social)
- Botão "Gerar 1ª mensagem" — chama `POST /conversations`
- Mensagens da IA exibidas em balões (estilo WhatsApp)
- Campo de texto: "Cole aqui a resposta do cliente..."
- Botão "Gerar resposta" — chama `POST /conversations/:id/reply`
- Botão de copiar em cada mensagem da IA (para colar no WhatsApp real)

---

## Importação CSV

Formato esperado do CSV:
```
businessName,segment,city,phone,notes
Clínica São Lucas,clínica,Palmas,63999990000,sem site - nota 3.2 no maps
```

Endpoint: `POST /leads/import` com `multipart/form-data`.
Backend processa linha a linha, calcula score e salva os leads.

---

## Variáveis de Ambiente (`.env` no backend)

```env
DATABASE_URL=postgres://sales:sales123@localhost:5432/salesdb
FUSION_TOKEN=seu_token_aqui
PORT=3000
```

---

## Fluxo Completo da POC

```
1. Vendedor cadastra lead manualmente OU importa CSV
2. Sistema calcula potentialScore automaticamente
3. Vendedor abre o lead → vai para /chat
4. Escolhe estratégia (consultiva, urgência, prova social)
5. Clica "Gerar 1ª mensagem" → IA gera abordagem personalizada
6. Vendedor copia a mensagem → manda no WhatsApp real
7. Cliente responde → vendedor cola a resposta no chat
8. Clica "Gerar resposta" → IA continua a negociação
9. Loop até fechar ou descartar
10. Vendedor atualiza status no Kanban
```

---

## O que NÃO entra nessa POC

- Integração real com WhatsApp API
- Scraping automático do Google Maps
- Autenticação/multi-usuário
- Dashboard com métricas de conversão (próxima iteração)

---

## Observações para o Claude Code

- Usar `class-validator` + `class-transformer` nos DTOs do NestJS
- CORS habilitado no NestJS para `http://localhost:5173`
- Seed opcional com 5 leads de exemplo para facilitar testes
- Não usar `synchronize: false` em produção — mas para POC, manter `true`
- Frontend deve ter tratamento de erro visual nas chamadas de IA (loading state + erro amigável)