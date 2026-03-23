import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ReplyDto } from './dto/reply.dto';
import { AiService, KEEP_RECENT } from '../ai/ai.service';
import { LeadsService } from '../leads/leads.service';

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly convService: ConversationsService,
    private readonly aiService: AiService,
    private readonly leadsService: LeadsService,
  ) {}

  @Get()
  findByLead(@Query('leadId') leadId: string) {
    return this.convService.findByLead(leadId);
  }

  @Post()
  async create(@Body() dto: CreateConversationDto) {
    const lead = await this.leadsService.findOne(dto.leadId);
    const firstMessage = await this.aiService.generateFirstMessage(lead, dto.strategy);
    return this.convService.create(dto, firstMessage);
  }

  @Post(':id/reply')
  async reply(@Param('id') id: string, @Body() dto: ReplyDto) {
    let conv = await this.convService.findOne(id);

    // Branch A: summarização (também faz refresh do perfil se necessário)
    if (this.aiService.needsSummarization(conv)) {
      const messagesToSummarize = conv.messages.slice(
        conv.summarizedUpTo,
        conv.messages.length - KEEP_RECENT,
      );
      if (messagesToSummarize.length > 0) {
        const newSummary = await this.aiService.generateSummary(
          messagesToSummarize,
          conv.summary,
        );
        let newProfile: string | undefined;
        if (this.aiService.needsProfileGeneration(conv)) {
          newProfile = await this.aiService.generateClientProfile(
            conv.messages,
            conv.clientProfile,
          );
        }
        conv = await this.convService.updateSummary(
          id,
          newSummary,
          conv.messages.length - KEEP_RECENT,
          newProfile,
        );
      }
    }
    // Branch B: geração inicial do perfil (antes do threshold de summarização)
    else if (this.aiService.needsProfileGeneration(conv)) {
      const newProfile = await this.aiService.generateClientProfile(
        conv.messages,
        conv.clientProfile,
      );
      conv = await this.convService.updateClientProfile(id, newProfile);
    }

    const aiReply = await this.aiService.generateReply(conv, dto.clientMessage);
    return this.convService.addReply(id, dto.clientMessage, aiReply);
  }
}
