import { IsString, IsIn, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  leadId: string;

  @IsString()
  @IsIn(['consultative', 'urgency', 'social_proof'])
  strategy: string;
}
