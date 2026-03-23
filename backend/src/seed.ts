import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LeadsService } from './leads/leads.service';
import { ConversationsService } from './conversations/conversations.service';
import { Lead } from './leads/lead.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const leadsService = app.get(LeadsService);
  const convService = app.get(ConversationsService);

  const leadsData = [
    {
      businessName: 'Clínica São Lucas',
      segment: 'clínica',
      city: 'Palmas',
      phone: '63999990001',
      notes: 'sem site - nota 3.2 no maps',
    },
    {
      businessName: 'Salão Beleza Total',
      segment: 'salão',
      city: 'Goiânia',
      phone: '62988880002',
      notes: 'sem site - fotos fracas - horário incompleto',
    },
    {
      businessName: 'Restaurante Sabor do Sul',
      segment: 'restaurante',
      city: 'Curitiba',
      phone: '41977770003',
      notes: 'avaliação ruim - sem site',
    },
    {
      businessName: 'Pet Shop Amigo Fiel',
      segment: 'pet shop',
      city: 'Belo Horizonte',
      phone: '31966660004',
      notes: 'fotos fracas - horário incompleto',
    },
    {
      businessName: 'Auto Center Silva',
      segment: 'oficina',
      city: 'São Paulo',
      phone: '11955550005',
      notes: 'sem site - concorrentes já têm presença digital',
    },
  ];

  const leads: Lead[] = [];
  for (const data of leadsData) {
    const lead = await leadsService.create(data);
    leads.push(lead);
    console.log(`Lead criado: ${lead.businessName} (score: ${lead.potentialScore})`);
  }

  const conv = await convService.create(
    { leadId: leads[0].id, strategy: 'consultative' },
    'Oi! Vi que a Clínica São Lucas ainda não tem um site próprio. Muitos pacientes hoje pesquisam no Google antes de ligar — será que vocês estão perdendo agendamentos por isso?',
  );
  await convService.addReply(
    conv.id,
    'Oi, pode ser. A gente recebe bem pelo Maps mesmo.',
    'Entendo! O Google Maps ajuda bastante. Mas quando o paciente quer mais detalhes — especialidades, convênios, horários — ele busca o site. Sem ele, muitos acabam escolhendo a clínica concorrente que aparece primeiro. Posso te mostrar como seria fácil resolver isso?',
  );
  console.log(`Conversa de exemplo criada para: ${leads[0].businessName}`);

  await app.close();
  console.log('Seed concluído!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
