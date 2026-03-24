import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsService } from '../services/leads';
import type { Lead, CreateLeadDto } from '../services/leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Plus, MessageSquare, Smartphone } from 'lucide-react';

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
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
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
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{score}</span>
    </div>
  );
}

const EMPTY_FORM: CreateLeadDto = {
  businessName: '',
  segment: '',
  city: '',
  phone: '',
  googleMapsUrl: '',
  notes: '',
  status: 'prospecting',
};

export default function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateLeadDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (status?: string) => {
    setLoading(true);
    setError('');
    try {
      setLeads(await leadsService.getAll(status === 'all' ? undefined : status));
    } catch {
      setError('Erro ao carregar leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await leadsService.create(form);
      setShowModal(false);
      setForm(EMPTY_FORM);
      load(statusFilter);
    } catch {
      setError('Erro ao criar lead.');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      await leadsService.importCsv(file);
      load(statusFilter);
    } catch {
      setError('Erro ao importar CSV.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // Contagem por status
  const countByStatus = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{leads.length} lead{leads.length !== 1 && 's'} encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Importar CSV
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Novo Lead
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Filtro + pills de status */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <SelectItem key={v} value={v}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const count = countByStatus[status] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === status
                    ? `${cfg.color} ${cfg.bg} ring-2 ring-offset-1 ring-current/30`
                    : `${cfg.color} ${cfg.bg} opacity-70 hover:opacity-100`
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-sm text-muted-foreground animate-pulse">Carregando...</div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-3 font-semibold">Empresa</TableHead>
                <TableHead className="py-3 font-semibold">Segmento</TableHead>
                <TableHead className="py-3 font-semibold">Cidade</TableHead>
                <TableHead className="py-3 font-semibold">Status</TableHead>
                <TableHead className="py-3 font-semibold">Score</TableHead>
                <TableHead className="py-3 font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(lead => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => navigate(`/leads/${lead.id}`)}
                >
                  <TableCell className="py-3 font-semibold">{lead.businessName}</TableCell>
                  <TableCell className="py-3 text-muted-foreground text-sm">{lead.segment || '—'}</TableCell>
                  <TableCell className="py-3 text-muted-foreground text-sm">{lead.city || '—'}</TableCell>
                  <TableCell className="py-3">
                    <StatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="py-3">
                    <ScoreBar score={lead.potentialScore} />
                  </TableCell>
                  <TableCell className="py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => navigate(`/leads/${lead.id}/chat`)}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </Button>
                      {lead.whatsappLink && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <a href={lead.whatsappLink} target="_blank" rel="noreferrer" title="WhatsApp">
                            <Smartphone className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Nome da empresa</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                required
                placeholder="Ex: Clínica São Lucas"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="segment">Segmento</Label>
                <Input
                  id="segment"
                  value={form.segment ?? ''}
                  onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}
                  placeholder="Ex: clínica"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city ?? ''}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Ex: Palmas"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone ?? ''}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="63999990000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="googleMapsUrl">URL Google Maps</Label>
                <Input
                  id="googleMapsUrl"
                  value={form.googleMapsUrl ?? ''}
                  onChange={e => setForm(f => ({ ...f, googleMapsUrl: e.target.value }))}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={form.notes ?? ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="sem site - nota 3.2 no maps"
                rows={3}
              />
            </div>
            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); setError(''); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
