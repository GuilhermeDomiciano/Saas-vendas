import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { leadsService } from '../services/leads';
import type { Lead } from '../services/leads';
import { Card, CardContent } from '@/components/ui/card';

const COLUMNS = [
  {
    id: 'prospecting',
    label: 'Prospecção',
    headerBg: 'bg-[oklch(0.93_0.06_220)]',
    headerText: 'text-[oklch(0.35_0.18_220)]',
    columnBg: 'bg-[oklch(0.96_0.02_220)] dark:bg-[oklch(0.18_0.03_220)]',
    dotColor: 'bg-[var(--status-prospecting)]',
    segmentBg: 'bg-[oklch(0.90_0.07_220)] text-[oklch(0.35_0.18_220)]',
  },
  {
    id: 'contacted',
    label: 'Contato feito',
    headerBg: 'bg-[oklch(0.95_0.06_60)]',
    headerText: 'text-[oklch(0.38_0.14_60)]',
    columnBg: 'bg-[oklch(0.97_0.02_60)] dark:bg-[oklch(0.18_0.03_60)]',
    dotColor: 'bg-[var(--status-contacted)]',
    segmentBg: 'bg-[oklch(0.92_0.07_60)] text-[oklch(0.38_0.14_60)]',
  },
  {
    id: 'negotiating',
    label: 'Em negociação',
    headerBg: 'bg-[oklch(0.93_0.06_300)]',
    headerText: 'text-[oklch(0.35_0.18_300)]',
    columnBg: 'bg-[oklch(0.96_0.02_300)] dark:bg-[oklch(0.18_0.03_300)]',
    dotColor: 'bg-[var(--status-negotiating)]',
    segmentBg: 'bg-[oklch(0.90_0.07_300)] text-[oklch(0.35_0.18_300)]',
  },
  {
    id: 'won',
    label: 'Fechado',
    headerBg: 'bg-[oklch(0.92_0.06_145)]',
    headerText: 'text-[oklch(0.32_0.15_145)]',
    columnBg: 'bg-[oklch(0.96_0.02_145)] dark:bg-[oklch(0.18_0.03_145)]',
    dotColor: 'bg-[var(--status-won)]',
    segmentBg: 'bg-[oklch(0.90_0.07_145)] text-[oklch(0.32_0.15_145)]',
  },
  {
    id: 'lost',
    label: 'Perdido',
    headerBg: 'bg-[oklch(0.93_0.06_20)]',
    headerText: 'text-[oklch(0.35_0.18_20)]',
    columnBg: 'bg-[oklch(0.96_0.02_20)] dark:bg-[oklch(0.18_0.03_20)]',
    dotColor: 'bg-[var(--status-lost)]',
    segmentBg: 'bg-[oklch(0.90_0.07_20)] text-[oklch(0.35_0.18_20)]',
  },
];

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-[var(--status-won)]' :
    score >= 40 ? 'bg-[var(--status-contacted)]' :
    'bg-muted-foreground/40';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">{score}</span>
    </div>
  );
}

type ColumnConfig = typeof COLUMNS[number];

function LeadCard({ lead, onClick, segmentBg }: { lead: Lead; onClick: () => void; segmentBg: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${isDragging ? 'opacity-40' : ''}`}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all mb-2 border-border/60">
        <CardContent className="p-3">
          <div className="font-semibold text-sm leading-tight mb-1">{lead.businessName}</div>
          <div className="flex items-center gap-1.5 mb-2">
            {lead.segment && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${segmentBg}`}>
                {lead.segment}
              </span>
            )}
            {lead.city && (
              <span className="text-[10px] text-muted-foreground">{lead.city}</span>
            )}
          </div>
          <ScoreBar score={lead.potentialScore} />
        </CardContent>
      </Card>
    </div>
  );
}

function Column({ col, leads, onCardClick }: {
  col: ColumnConfig; leads: Lead[]; onCardClick: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[200px] rounded-xl overflow-hidden border border-border/50 transition-all ${
        isOver ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 ${col.headerBg}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
          <h3 className={`text-xs font-semibold ${col.headerText}`}>{col.label}</h3>
        </div>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${col.headerBg} ${col.headerText}`}>
          {leads.length}
        </span>
      </div>

      {/* Column body */}
      <div className={`p-2 min-h-[200px] ${col.columnBg}`}>
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onCardClick(lead)}
              segmentBg={col.segmentBg}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="text-xs text-muted-foreground/40 text-center py-8">
            Arraste leads para cá
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    leadsService.getAll()
      .then(setLeads)
      .catch(() => setError('Erro ao carregar leads.'))
      .finally(() => setLoading(false));
  }, []);

  const byStatus = (status: string) => leads.filter(l => l.status === status);
  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const targetStatus = COLUMNS.find(c => c.id === over.id)?.id;
    if (!targetStatus) return;

    const leadId = active.id as string;
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === targetStatus) return;

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: targetStatus } : l));
    try {
      await leadsService.update(leadId, { status: targetStatus });
    } catch {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: lead.status } : l));
      setError('Erro ao atualizar status.');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground animate-pulse">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Arraste os leads entre colunas para atualizar o status</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              col={col}
              leads={byStatus(col.id)}
              onCardClick={lead => navigate(`/leads/${lead.id}`)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead && (
            <Card className="shadow-xl w-[200px] border-primary">
              <CardContent className="p-3">
                <div className="font-semibold text-sm">{activeLead.businessName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {[activeLead.segment, activeLead.city].filter(Boolean).join(' — ')}
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
