// Popula o banco com os dados estruturais mínimos pro System funcionar:
// patentes, divisões, tipos de requerimento, itens de loja e banners iniciais.
// Rodar: npm run seed  (depois de `npx prisma migrate deploy`)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RANKS = [
  'Recruta', 'Soldado', 'Cabo', 'Sargento', 'Subtenente', 'Aspirante', 'Tenente',
  'Capitão', 'Major', 'Tenente-Coronel', 'Coronel', 'General', 'Comandante-Geral', 'Supremo',
];

const DIVISIONS = [
  { sig: 'AFD', name: 'Academia de Formação DCC', icon: '🎓', desc: 'Formação, instrução e aperfeiçoamento dos policiais.' },
  { sig: 'COR', name: 'Corregedoria', icon: '⚖️', desc: 'Disciplina, fiscalização e integridade institucional.' },
  { sig: 'COE', name: 'Comando de Operações Especiais', icon: '🛡️', desc: 'Operações especiais e atividades de alta complexidade.' },
  { sig: 'INT', name: 'Departamento de Inteligência', icon: '🔎', desc: 'Inteligência, segurança e análise interna.' },
  { sig: 'RH', name: 'Recursos Humanos', icon: '📋', desc: 'Gestão de membros, carreiras e registros.' },
  { sig: 'COM', name: 'Comunicação Social', icon: '📣', desc: 'Notícias, campanhas, eventos e imagem institucional.' },
  { sig: 'DTI', name: 'Departamento de Tecnologia da Informação', icon: '🖥️', desc: 'Manutenção do DCC System e ferramentas internas.' },
  { sig: 'Estado-Maior', name: 'Estado-Maior', icon: '🎖️', desc: 'Assessoria direta ao Alto Comando.' },
];

const REQUIREMENT_TYPES = [
  { id: 'instrucao', name: 'Instrução Inicial', icon: '🎓', desc: 'Registrar recrutas aprovados na instrução inicial.', order: 1 },
  { id: 'promocao', name: 'Promoção', icon: '⬆️', desc: 'Solicitar promoção de patente para um militar.', order: 2 },
  { id: 'rebaixamento', name: 'Rebaixamento', icon: '⬇️', desc: 'Solicitar rebaixamento disciplinar de patente.', order: 3 },
  { id: 'gratificacao', name: 'Gratificação', icon: '🪙', desc: 'Conceder Elite Coins por desempenho ou mérito.', order: 4 },
  { id: 'advertencia', name: 'Advertência', icon: '⚠️', desc: 'Registrar advertência disciplinar formal.', order: 5 },
  { id: 'licenca', name: 'Licença', icon: '🛏️', desc: 'Solicitar afastamento temporário do militar.', order: 6 },
  { id: 'desligamento', name: 'Desligamento', icon: '⛔', desc: 'Solicitar desligamento do quadro da corporação.', order: 7 },
  { id: 'curso', name: 'Curso', icon: '📘', desc: 'Registrar aprovação em curso interno.', order: 8 },
];

const SHOP_ITEMS = [
  { code: 'profile-cover-01', icon: '🖼️', name: 'Capa Olhar Supremo', description: 'Uma capa exclusiva para personalizar o seu perfil.', kind: 'PROFILE_COVER', imageUrl: '/assets/store/capa-olhar-supremo-v1.jpg', price: 50 },
  { code: 'profile-cover-02', icon: '🖼️', name: 'Capa Olhar Rubro', description: 'Uma capa em alta definição com visual intenso para o seu perfil.', kind: 'PROFILE_COVER', imageUrl: '/assets/store/capa-olhar-rubro-v1.jpg', price: 75 },
  { code: 'emblem-papai-noel-01', icon: '🎅', name: 'Emblema Papai Noel', description: 'Um emblema natalino exclusivo para a sua coleção.', kind: 'EMBLEM', imageUrl: '/assets/store/gorro-papai-noel-v3.png', price: 30 },
  { icon: '🎖️', name: 'Moldura Dourada de Perfil', price: 40 },
  { icon: '🪪', name: 'Carteirinha Holográfica', price: 25 },
  { icon: '🎨', name: 'Tema Comando Dourado', price: 60 },
  { icon: '📛', name: 'Emblema Personalizado', price: 30 },
  { icon: '⭐', name: 'Destaque no Feed (7 dias)', price: 15 },
  { icon: '🏷️', name: 'TAG Exclusiva de Divisão', price: 50 },
];

const BANNERS = [
  { title: 'Polícia DCC', subtitle: 'FORMANDO LÍDERES', gradient: 'linear-gradient(120deg,#0a1a33,#122a4d)', order: 1 },
  { title: 'Inscrições abertas', subtitle: 'CURSO DE AÇÕES TÁTICAS', gradient: 'linear-gradient(120deg,#3a1010,#521414)', order: 2 },
];

async function main() {
  console.log('Semeando patentes...');
  for (let i = 0; i < RANKS.length; i++) {
    await prisma.rank.upsert({ where: { name: RANKS[i] }, update: {}, create: { name: RANKS[i], level: i + 1 } });
  }

  console.log('Semeando divisões...');
  for (const d of DIVISIONS) {
    await prisma.division.upsert({ where: { sig: d.sig }, update: {}, create: d });
  }

  console.log('Semeando tipos de requerimento...');
  for (const t of REQUIREMENT_TYPES) {
    await prisma.requirementType.upsert({ where: { id: t.id }, update: {}, create: t });
  }

  console.log('Semeando itens de loja...');
  for (const item of SHOP_ITEMS) {
    if (item.code) {
      await prisma.shopItem.upsert({ where: { code: item.code }, update: item, create: item });
    } else {
      const exists = await prisma.shopItem.findFirst({ where: { name: item.name } });
      if (!exists) await prisma.shopItem.create({ data: item });
    }
  }

  console.log('Semeando banners...');
  for (const b of BANNERS) {
    const exists = await prisma.banner.findFirst({ where: { title: b.title } });
    if (!exists) await prisma.banner.create({ data: b });
  }

  console.log('✅ Seed concluído.');
  if (process.env.HABBO_BOOTSTRAP_ADMIN) {
    console.log(`Lembrete: a conta "${process.env.HABBO_BOOTSTRAP_ADMIN}" vira ADMIN automaticamente no primeiro cadastro (via /api/auth/register).`);
  } else {
    console.log('Aviso: HABBO_BOOTSTRAP_ADMIN não definido no .env — nenhuma conta vai virar ADMIN automaticamente. Defina antes do primeiro cadastro, ou promova manualmente depois via banco de dados.');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
