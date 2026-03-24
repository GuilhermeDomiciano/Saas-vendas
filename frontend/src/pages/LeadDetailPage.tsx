import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leadsService } from '../services/leads';
import type { Lead, UpdateLeadDto } from '../services/leads';
import { conversationsService } from '../services/conversations';
import type { Conversation } from '../services/conversations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, MessageSquare, Smartphone, Pencil, X, ExternalLink } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  prospecting: {
    label: 'Prospecção',
    color: 'text-[oklch(0.45_0.18_220)]',
    bg: 'bg-[oklch(0.93_0.06_220)]',
    dot: 'bg-[var(--status-prospecting)]',
  },
  contacted: {
    label: 'Contato feito',
    color: 'text-[oklch(0.50_0.14_60)]',
    bg: 'bg-[oklch(0.95_0.06_60)]',
    dot: 'bg-[var(--status-contacted)]',
  },
  negotiating: {
    label: 'Em negociação',
    color: 'text-[oklch(0.45_0.18_300)]',
    bg: 'bg-[oklch(0.93_0.06_300)]',
    dot: 'bg-[var(--status-negotiating)]',
  },
  won: {
    label: 'Fechado',
    color: 'text-[oklch(0.40_0.15_145)]',
    bg: 'bg-[oklch(0.92_0.06_145)]',
    dot: 'bg-[var(--status-won)]',
  },
  lost: {
    label: 'Perdido',
    color: 'text-[oklch(0.42_0.18_20)]',
    bg: 'bg-[oklch(0.93_0.06_20)]',
    dot: 'bg-[var(--status-lost)]',
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-[var(--status-won)]' :
    score >= 40 ? 'bg-[var(--status-contacted)]' :
    'bg-muted-foreground/40';
  const label =
    score >= 70 ? 'text-[oklch(0.40_0.15_145)]' :
    score >= 40 ? 'text-[oklch(0.50_0.14_60)]' :
    'text-muted-foreground';
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-semibold tabular-nums ${label}`}>{score}/100</span>
    </div>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateLeadDto>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([leadsService.getOne(id), conversationsService.getByLead(id)])
      .then(([l, c]) => { setLead(l); setForm(l); setConversations(c); })
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      const updated = await leadsService.update(id, form);
      setLead(updated);
      setEditing(false);
    } catch {
      setError('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground animate-pulse">Carregando...</div>;
  if (error && !lead) return <div className="text-destructive py-16 text-center">{error}</div>;
  if (!lead) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-4 h-4" />
            Leads
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{lead.businessName}</h1>
            <StatusBadge status={lead.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.whatsappLink && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={lead.whatsappLink} target="_blank" rel="noreferrer">
                <Smartphone className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => navigate(`/leads/${lead.id}/chat`)}>
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-4">
        {/* Left column: Lead data */}
        <div className="space-y-3">
          {!editing ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Dados do Lead</CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Score destacado */}
                  <div className="pb-3 border-b">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Score de potencial</p>
                    <ScoreBar score={lead.potentialScore} />
                  </div>

                  <dl className="space-y-2.5">
                    {([
                      ['Segmento', lead.segment],
                      ['Cidade', lead.city],
                      ['Telefone', lead.phone],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex items-start gap-3">
                        <dt className="w-28 shrink-0 text-sm text-muted-foreground">{label}</dt>
                        <dd className="text-sm font-medium">{value || <span className="text-muted-foreground/50 font-normal">—</span>}</dd>
                      </div>
                    ))}
                    {lead.googleMapsUrl && (
                      <div className="flex items-start gap-3">
                        <dt className="w-28 shrink-0 text-sm text-muted-foreground">Google Maps</dt>
                        <dd>
                          <a
                            href={lead.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Ver no mapa <ExternalLink className="w-3 h-3" />
                          </a>
                        </dd>
                      </div>
                    )}
                    {lead.notes && (
                      <div className="flex items-start gap-3">
                        <dt className="w-28 shrink-0 text-sm text-muted-foreground">Observações</dt>
                        <dd className="text-sm whitespace-pre-wrap">{lead.notes}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Editar Lead</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da empresa</Label>
                    <Input value={form.businessName ?? ''} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Segmento</Label>
                      <Input value={form.segment ?? ''} onChange={e => setForm(f => ({ ...f, segment: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input value={form.city ?? ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status ?? lead.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                            <SelectItem key={v} value={v}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
                  </div>
                  {error && <div className="text-sm text-destructive">{error}</div>}
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Conversations */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">
                Conversas
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{conversations.length}</Badge>
                )}
              </CardTitle>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => navigate(`/leads/${lead.id}/chat`)}>
                <MessageSquare className="w-3.5 h-3.5" />
                Abrir chat
              </Button>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                  <p>Nenhuma conversa iniciada.</p>
                  <Button variant="link" size="sm" className="mt-1" onClick={() => navigate(`/leads/${lead.id}/chat`)}>
                    Iniciar chat →
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/leads/${lead.id}/chat`)}
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {conv.strategy}
                        </span>
                        <span className="text-muted-foreground">{conv.messages.length} mensagens</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(conv.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
