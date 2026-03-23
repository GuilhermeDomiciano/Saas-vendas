import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
  ) {}

  findAll(status?: string): Promise<Lead[]> {
    if (status) {
      return this.leadsRepo.find({ where: { status } });
    }
    return this.leadsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Lead> {
    const lead = await this.leadsRepo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} não encontrado`);
    return lead;
  }

  async create(dto: CreateLeadDto): Promise<Lead> {
    const lead = this.leadsRepo.create(dto);
    lead.potentialScore = this.calcScore(dto.notes);
    lead.whatsappLink = this.buildWhatsappLink(dto.phone) ?? '';
    return this.leadsRepo.save(lead);
  }

  async update(id: string, dto: UpdateLeadDto): Promise<Lead> {
    const lead = await this.findOne(id);
    Object.assign(lead, dto);
    if (dto.notes !== undefined) {
      lead.potentialScore = this.calcScore(dto.notes);
    }
    if (dto.phone !== undefined) {
      lead.whatsappLink = this.buildWhatsappLink(dto.phone) ?? '';
    }
    return this.leadsRepo.save(lead);
  }

  async remove(id: string): Promise<void> {
    const lead = await this.findOne(id);
    await this.leadsRepo.remove(lead);
  }

  async importFromCsv(rows: Array<Record<string, string>>): Promise<Lead[]> {
    const leads: Lead[] = [];
    for (const row of rows) {
      const lead = this.leadsRepo.create({
        businessName: row.businessName,
        segment: row.segment,
        city: row.city,
        phone: row.phone,
        notes: row.notes,
      });
      lead.potentialScore = this.calcScore(row.notes);
      lead.whatsappLink = this.buildWhatsappLink(row.phone) ?? '';
      leads.push(await this.leadsRepo.save(lead));
    }
    return leads;
  }

  private calcScore(notes?: string): number {
    if (!notes) return 0;
    const n = notes.toLowerCase();
    let score = 0;
    if (n.includes('sem site') || n.includes('sem website')) score += 40;
    if (n.includes('nota') || n.includes('avalia') || n.includes('ruim') || n.includes('baixa')) score += 30;
    if (n.includes('foto') || n.includes('imagem') || n.includes('fraca')) score += 20;
    if (n.includes('horário') || n.includes('horario') || n.includes('incompleto')) score += 10;
    return Math.min(score, 100);
  }

  private buildWhatsappLink(phone?: string): string | undefined {
    if (!phone) return undefined;
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/55${digits}`;
  }
}
