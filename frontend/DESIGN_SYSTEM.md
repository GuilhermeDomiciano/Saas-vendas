# Design System — Sales AI

## Base

- **UI Library:** [shadcn/ui](https://ui.shadcn.com) (Radix UI + Tailwind CSS v4)
- **Font:** Geist Variable (instalada automaticamente pelo shadcn init)
- **Tema:** Light/Dark via CSS custom properties (oklch)
- **Border Radius:** `0.625rem` (padrão shadcn)

---

## Componentes utilizados

| Componente | Uso | Importação |
|---|---|---|
| `Button` | Ações primárias/secundárias, navegação | `@/components/ui/button` |
| `Badge` | Status do lead, scores, tags de estratégia | `@/components/ui/badge` |
| `Table` | Listagem de leads | `@/components/ui/table` |
| `Card` | Containers de conteúdo, cards do Kanban, balões de chat | `@/components/ui/card` |
| `Dialog` | Modais (novo lead) | `@/components/ui/dialog` |
| `Input` | Campos de texto simples | `@/components/ui/input` |
| `Textarea` | Campo de observações, input do chat | `@/components/ui/textarea` |
| `Label` | Labels de formulário | `@/components/ui/label` |
| `Select` | Filtro de status, seletor de estratégia/conversa | `@/components/ui/select` |
| `Separator` | Divisor visual entre seções | `@/components/ui/separator` |
| `Tooltip` | Dicas sobre estratégias, botão de copiar | `@/components/ui/tooltip` |

---

## Padrões de uso

### Variantes de Button

- `default` — ação primária (salvar, enviar, chat)
- `secondary` — ação alternativa (nova conversa)
- `outline` — ação terciária (editar, cancelar, importar CSV, WhatsApp)
- `ghost` — navegação inline, ações discretas (voltar, ações na tabela)
- `link` — links semânticos dentro de texto

### Variantes de Badge por status do lead

```ts
const STATUS_CONFIG = {
  prospecting: { label: 'Prospecção',     variant: 'outline' },
  contacted:   { label: 'Contato feito',  variant: 'secondary' },
  negotiating: { label: 'Em negociação',  variant: 'default' },
  won:         { label: 'Fechado',        variant: 'default' },
  lost:        { label: 'Perdido',        variant: 'destructive' },
};
```

### Score de potencial (cores)

- `>= 70` → `text-green-600 font-semibold`
- `>= 40` → `text-yellow-600 font-medium`
- `< 40` → `text-muted-foreground`

---

## Layout

### App shell

- Header fixo com nav usando `Button` variant `ghost`/`secondary`
- `container px-6 py-6` no main content
- Página de chat usa `h-[calc(100vh-3.5rem-3rem)]` para ocupar tela toda

### Kanban (Pipeline)

- Colunas com cores de fundo suaves por status (`bg-slate-50`, `bg-blue-50`, etc.)
- Ring visual via `ring-2 ring-primary` no hover de drag
- Cards usam `Card` com `cursor-grab`

### Chat

- Balões da IA: `Card bg-card` alinhados à esquerda
- Balões do cliente: `Card bg-primary text-primary-foreground` alinhados à direita
- Botão de copiar aparece no `group-hover` do balão da IA
- Loading: `animate-pulse` com texto "IA digitando..."

---

## Convenções

- **Imports de tipo:** sempre usar `import type` (exigido por `verbatimModuleSyntax: true`)
- **Path alias:** usar `@/` para imports de componentes e lib (`@/components/ui/button`)
- **Sem inline styles:** todo styling via Tailwind classes
- **Sem emojis em componentes** exceto nos atalhos de WhatsApp (`📱`) e copiar (`📋`), que serão substituídos por ícones do Lucide quando houver necessidade

---

## Como adicionar novos componentes shadcn

```bash
npx shadcn@latest add [nome-do-componente]
```

Os componentes ficam em `src/components/ui/` e podem ser customizados livremente.
