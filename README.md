# System DPE

> Portfólio técnico privado — sistema web de gestão, automação e operações.

O **System DPE** é um projeto real de gestão operacional para uma corporação virtual no Habbo. Ele reúne painel web, API, banco de dados, autenticação, permissões, auditoria, rotinas administrativas, testes e integração com automações externas.

Este repositório existe para **documentar tecnicamente o projeto e minha atuação nele**. O projeto original é colaborativo e permanece associado ao repositório `muxcodes/System_DPE`.

## 👤 Minha atuação no projeto

Minha participação envolve principalmente:

- definição e refinamento de requisitos;
- planejamento de funcionalidades;
- evolução de fluxos e interface;
- testes funcionais e validação;
- investigação e correção de bugs;
- versionamento com Git/GitHub;
- deploy e manutenção em ambiente Linux/Discloud;
- configuração de permissões e regras de negócio;
- integração entre sistema web e automações;
- acompanhamento de segurança, logs, backups e disponibilidade.

O objetivo deste repositório é mostrar para recrutadores **como eu trabalho com um sistema real**, não apenas listar cursos ou tecnologias.

## 🧩 Funcionalidades

Entre os módulos e fluxos existentes no System DPE estão:

- autenticação e controle de acesso por cargo;
- gestão de membros, patentes, divisões e histórico;
- turnos com Base, O.C., O.B. e Ausência;
- contabilização de tempo e mudanças de setor;
- promoções, demissões, aulas e requisições;
- documentos institucionais;
- notificações e mensagens;
- logs administrativos e central de segurança;
- Rede DPE em formato de microblog;
- rankings, condecorações e loja;
- saúde do sistema, backups e rotinas de deploy;
- APIs de integração para automações privadas.

## 🛠️ Tecnologias

- Node.js
- Express
- Prisma ORM
- SQLite
- JavaScript
- HTML / CSS
- JWT
- bcrypt
- Zod
- Helmet
- Git / GitHub
- GitHub Actions
- Linux / Discloud

## 🏗️ Arquitetura

```text
Interface Web
     │
     ▼
API Express
     │
     ├── autenticação / permissões
     ├── regras de negócio
     ├── auditoria / segurança
     └── integrações privadas
     │
     ▼
Prisma ORM
     │
     ▼
SQLite
```

## 🔐 Segurança

O projeto possui práticas como:

- senhas armazenadas com hash;
- sessões JWT;
- autorização no backend;
- validação de entrada;
- rate limiting;
- Helmet;
- auditoria de ações administrativas;
- separação de tokens de integração;
- arquivos `.env`, banco e credenciais fora do Git.

## 🤖 DPE Command

O **DPE Command não faz parte deste repositório**.

O bot operacional possui lógica própria e integrações que são mantidas separadamente de propósito. Aqui ficam apenas as interfaces necessárias para integração, sem expor o código do bot.

## 🧪 Testes e qualidade

O projeto possui testes para fluxos críticos, incluindo turnos, permissões, autenticação, segurança, aulas, notificações, integração, recuperação de senha e regras administrativas.

Durante a montagem desta cópia de portfólio, o GitHub Actions fica em **execução manual** para evitar builds incompletos enquanto arquivos são organizados.

## 📌 Para recrutadores

Este projeto demonstra experiência prática com:

**Desenvolvimento Web · APIs · Backend · Banco de Dados · Automação · Git/GitHub · Linux · Debugging · Testes · Segurança · Deploy · Troubleshooting**

Não se trata de experiência profissional formal em empresa. É experiência prática adquirida na criação, evolução e operação de um sistema real.

## © Créditos e uso

Projeto colaborativo. Esta cópia é mantida por **Miquéias Ferreira de Lima Martins (@mikesz2)** para fins de portfólio e documentação técnica.

O repositório original está associado a **muxcodes/System_DPE** e seus respectivos colaboradores.

**Todos os direitos reservados.** O conteúdo deste repositório não concede permissão para copiar, redistribuir, republicar ou apresentar o projeto como autoria própria. Consulte `CREDITS.md` e `LICENSE`.
