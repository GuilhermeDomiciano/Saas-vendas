import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, Message } from './conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { LeadsService } from '../leads/leads.service';
import { KEEP_RECENT } from '../ai/ai.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    private readonly leadsService: LeadsService,
  ) {}

  findByLead(leadId: string): Promise<Conversation[]> {
    return this.convRepo.find({
      where: { lead: { id: leadId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Conversation> {
    const conv = await this.convRepo.findOne({ where: { id } });
    if (!conv) throw new NotFoundException(`Conversa ${id} não encontrada`);
    return conv;
  }

  async create(dto: CreateConversationDto, firstMessage: string): Promise<Conversation> {
    const lead = await this.leadsService.findOne(dto.leadId);
    const msg: Message = {
      role: 'ai',
      content: firstMessage,
      timestamp: new Date().toISOString(),
    };
    const conv = this.convRepo.create({
      lead,
      strategy: dto.strategy,
      messages: [msg],
    });
    return this.convRepo.save(conv);
  }

  async updateSummary(
    id: string,
    summary: string,
    newSummarizedUpTo: number,
    clientProfile?: string,
  ): Promise<Conversation> {
    const conv = await this.findOne(id);
    conv.summary = summary;
    conv.summarizedUpTo = newSummarizedUpTo;
    conv.messages = conv.messages.slice(-KEEP_RECENT);
    if (clientProfile !== undefined) conv.clientProfile = clientProfile;
    return this.convRepo.save(conv);
  }

  async updateClientProfile(id: string, clientProfile: string): Promise<Conversation> {
    const conv = await this.findOne(id);
    conv.clientProfile = clientProfile;
    return this.convRepo.save(conv);
  }

  async addReply(
    id: string,
    clientMessage: string,
    aiReply: string,
  ): Promise<Conversation> {
    const conv = await this.findOne(id);
    const clientMsg: Message = {
      role: 'client',
      content: clientMessage,
      timestamp: new Date().toISOString(),
    };
    const aiMsg: Message = {
      role: 'ai',
      content: aiReply,
      timestamp: new Date().toISOString(),
    };
    conv.messages = [...conv.messages, clientMsg, aiMsg];
    return this.convRepo.save(conv);
  }
}
