import { api } from './api';

export interface Lead {
  id: string;
  businessName: string;
  segment: string;
  city: string;
  phone: string;
  googleMapsUrl: string;
  notes: string;
  potentialScore: number;
  status: string;
  whatsappLink: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateLeadDto = Omit<Lead, 'id' | 'potentialScore' | 'whatsappLink' | 'createdAt' | 'updatedAt'>;
export type UpdateLeadDto = Partial<CreateLeadDto>;

export const leadsService = {
  getAll: (status?: string) =>
    api.get<Lead[]>('/leads', { params: status ? { status } : {} }).then(r => r.data),

  getOne: (id: string) =>
    api.get<Lead>(`/leads/${id}`).then(r => r.data),

  create: (dto: CreateLeadDto) =>
    api.post<Lead>('/leads', dto).then(r => r.data),

  update: (id: string, dto: UpdateLeadDto) =>
    api.put<Lead>(`/leads/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/leads/${id}`),

  importCsv: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<Lead[]>('/leads/import', form).then(r => r.data);
  },
};
