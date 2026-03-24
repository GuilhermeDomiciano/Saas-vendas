import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leadsService } from '../services/leads';
import type { Lead } from '../services/leads';
import { conversationsService } from '../services/conversations';
import type { Conversation } from '../services/conversations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ArrowLeft, Send, Copy, Check, MessageSquarePlus, Bot, Sparkles } from 'lucide-react';

const STRATEGIES = [
  { value: 'consultative', label: 'Consultivo', description: 'Abordagem educativa e empática' },
  { value: 'urgency', label: 'Urgência', description: 'Senso de urgência real' },
  { value: 'social_proof', label: 'Prova Social', description: 'Baseada em cases de sucesso' },
];

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%]">
        <span className="text-[10px] text-muted-foreground mb-1 block ml-1">IA</span>
        <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/60 inline-block" />
            <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/60 inline-block" />
            <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/60 inline-block" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState('consultative');
  const [clientMessage, setClientMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  useEffect(() => {
    if (!id) return;
    Promise.all([leadsService.getOne(id), conversationsService.getByLead(id)])
      .then(([l, convs]) => {
        setLead(l);
        setConversations(convs);
        if (convs.length > 0) setActiveConvId(convs[0].id);
      })
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const handleGenerateFirst = async () => {
    if (!id) return;
    setAiLoading(true);
    setError('');
    try {
      const conv = await conversationsService.create(id, strategy);
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
    } catch {
      setError('Erro ao gerar mensagem. Verifique o token da IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReply = async () => {
    if (!activeConvId || !clientMessage.trim()) return;
    setAiLoading(true);
    setError('');
    const msg = clientMessage;
    setClientMessage('');
    try {
      const updated = await conversationsService.reply(activeConvId, msg);
      setConversations(prev => prev.map(c => c.id === activeConvId ? updated : c));
    } catch {
      setError('Erro ao gerar resposta. Verifique o token da IA.');
      setClientMessage(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = (content: string, msgId: string) => {
    navigator.clipboard.writeText(content);
    setCopied(msgId);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground animate-pulse">Carregando...</div>;
  if (!lead) return <div className="text-destructive py-16 text-center">{error}</div>;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(`/leads/${id}`)}>
              <ArrowLeft className="w-4 h-4" />
              {lead.businessName}
            </Button>
            {conversations.length > 1 && (
              <Select value={activeConvId ?? ''} onValueChange={setActiveConvId}>
                <SelectTrigger className="w-56 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conversations.map((c, i) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.strategy} — {new Date(c.createdAt).toLocaleDateString('pt-BR')} ({i + 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Strategy bar */}
        <div className="flex items-center gap-3 py-2.5 border-b">
          <span className="text-xs font-medium text-muted-foreground">Estratégia:</span>
          <div className="flex gap-1.5">
            {STRATEGIES.map(s => (
              <Tooltip key={s.value}>
                <TooltipTrigger asChild>
                  <Button
                    variant={strategy === s.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setStrategy(s.value)}
                  >
                    {s.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{s.description}</p></TooltipContent>
              </Tooltip>
            ))}
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="ml-auto h-7 text-xs gap-1.5"
            onClick={handleGenerateFirst}
            disabled={aiLoading}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            {aiLoading && !activeConv ? 'Gerando...' : 'Nova conversa'}
          </Button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-3 bg-muted/20">
          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive mx-auto max-w-lg">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!activeConv && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Nenhuma conversa ativa</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha uma estratégia e clique em <strong>Nova conversa</strong> para começar.
                </p>
              </div>
              <Button onClick={handleGenerateFirst} disabled={aiLoading} className="gap-1.5">
                <Bot className="w-4 h-4" />
                {aiLoading ? 'Gerando...' : 'Gerar primeira mensagem'}
              </Button>
            </div>
          )}

          {activeConv?.messages.map((msg, i) => {
            const isAi = msg.role === 'ai';
            const msgKey = `${activeConv.id}-${i}`;
            return (
              <div key={msgKey} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[70%] relative group`}>
                  {isAi && (
                    <span className="text-[10px] text-muted-foreground mb-1 block ml-1">IA</span>
                  )}
                  <div
                    className={`px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                      isAi
                        ? 'bg-card border border-border text-foreground rounded-2xl rounded-tl-sm'
                        : 'bg-[oklch(0.40_0.15_145)] text-white rounded-2xl rounded-tr-sm'
                    }`}
                  >
                    {msg.content}
                    <span className={`text-[10px] block mt-1.5 text-right ${
                      isAi ? 'text-muted-foreground' : 'text-white/60'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {isAi && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -top-1 -right-9 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopy(msg.content, msgKey)}
                        >
                          {copied === msgKey
                            ? <Check className="w-3.5 h-3.5 text-[var(--status-won)]" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Copiar mensagem</p></TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}

          {aiLoading && activeConv && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeConv && (
          <div className="border-t pt-3 flex gap-2 items-end bg-background">
            <Textarea
              className="resize-none min-h-[52px] flex-1"
              placeholder="Cole aqui a resposta do cliente..."
              value={clientMessage}
              onChange={e => setClientMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
              disabled={aiLoading}
              rows={2}
            />
            <Button
              className="h-[52px] w-[52px] p-0 shrink-0"
              onClick={handleReply}
              disabled={aiLoading || !clientMessage.trim()}
              title="Enviar"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
