import { api } from './api';

export interface Message {
  role: 'ai' | 'client';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  strategy: string;
  messages: Message[];
  createdAt: string;
  lead: { id: string; businessName: string };
}

export const conversationsService = {
  getByLead: (leadId: string) =>
    api.get<Conversation[]>('/conversations', { params: { leadId } }).then(r => r.data),

  create: (leadId: string, strategy: string) =>
    api.post<Conversation>('/conversations', { leadId, strategy }).then(r => r.data),

  reply: (id: string, clientMessage: string) =>
    api.post<Conversation>(`/conversations/${id}/reply`, { clientMessage }).then(r => r.data),
};
