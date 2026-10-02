# DPE System — Portfolio Edition

Sistema web de gestão, operações e automação desenvolvido para uma corporação virtual no Habbo.

Esta edição existe para demonstrar arquitetura, backend, regras de negócio, interface administrativa, segurança, testes e operação do sistema. O componente proprietário **DPE Command** não faz parte deste repositório e permanece privado.

## O que o projeto resolve

O DPE System centraliza processos que antes dependeriam de controle manual, incluindo:

- gestão de membros, patentes e divisões;
- autenticação e permissões por nível de acesso;
- turnos com Base, O.C., O.B. e Ausência;
- contabilização de tempo e alterações de setor;
- promoções, demissões, aulas e requisições;
- histórico de perfil e auditoria;
- documentos e comunicação interna;
- notificações e mensagens;
- rede social interna em formato de microblog;
- rankings, condecorações e loja;
- saúde do sistema, backups e rotinas de deploy;
- interfaces de integração com automações privadas.

## Minha atuação

Minha participação no projeto envolve:

- levantamento e refinamento de requisitos;
- definição de fluxos e regras de negócio;
- evolução de frontend e backend;
- testes funcionais e regressão;
- investigação e correção de bugs;
- versionamento com Git/GitHub;
- deploy e manutenção em Linux/Discloud;
- permissões, auditoria, segurança e backups;
- integração entre o sistema web e serviços externos.

## Stack

**Backend:** Node.js, Express, Prisma ORM  
**Banco:** SQLite  
**Frontend:** JavaScript, HTML, CSS  
**Segurança:** JWT, bcrypt, Helmet, Zod, rate limiting  
**Infra:** Git, GitHub Actions, Linux, Discloud

## Arquitetura

```text
Usuário
  |
  v
Interface Web
  |
  v
API Express
  |
  +-- autenticação e permissões
  +-- regras de negócio
  +-- auditoria e segurança
  +-- integrações privadas
  |
  v
Prisma ORM
  |
  v
SQLite
```

## Segurança

- senhas armazenadas com hash;
- autenticação por JWT;
- autorização aplicada no backend;
- validação de entrada;
- rate limiting e Helmet;
- auditoria de ações administrativas;
- tokens de integração separados;
- arquivos `.env`, banco e credenciais fora do Git.

## Sobre o DPE Command

O bot operacional **não é publicado** nesta edição. Sua implementação, comandos, automações e lógica proprietária permanecem em ambiente privado.

Este repositório expõe apenas o necessário para apresentar o sistema web e sua arquitetura.

## Para recrutadores

Este projeto demonstra experiência prática com:

**Backend · APIs REST · Banco de dados · Automação · Git/GitHub · Linux · Debugging · Testes · Segurança · Deploy · Troubleshooting**

É um projeto colaborativo real utilizado como experiência prática e portfólio técnico.

## Créditos

Projeto colaborativo. Esta edição de portfólio é mantida por **Miquéias Ferreira de Lima Martins (@mikesz2)**.

O projeto original está associado ao repositório privado `muxcodes/System_DPE` e seus colaboradores.

Consulte também `CREDITS.md`, `LICENSE` e `RECRUITER_OVERVIEW.md`.
