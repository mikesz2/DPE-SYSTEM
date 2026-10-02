# Release — System DPE 3.0

Checklist de fechamento da versão estável 3.0.0. Os itens automatizados são cobertos pela suíte/CI; os itens operacionais continuam como validação de produção.

## 1. Antes do deploy
- [ ] CI da `main` 100% verde.
- [ ] `npm run backup` conclui sem erro.
- [ ] Existe snapshot válido em `data/backups/` com `.sha256`.
- [ ] `JWT_SECRET` possui 32+ caracteres.
- [ ] `DPE_COMMAND_API_TOKEN` possui 32+ caracteres e está igual no site e no DPE Command.
- [ ] `CORS_ORIGIN` aponta somente para o domínio oficial.
- [ ] `NODE_ENV=production`.

## 2. Deploy
- [ ] Discloud puxou a `main` mais recente.
- [ ] Launcher criou backup antes do `prisma db push`.
- [ ] Seed não foi executado novamente em banco existente.
- [ ] `data/system-dpe.db` foi preservado.
- [ ] `SYSTEM_URL=https://dominio npm run deploy:check` retorna sucesso.
- [ ] `deploy:check` confirma `NODE_ENV=production`, versão esperada, bundles críticos, CSP/anti-frame/nosniff e APIs administrativas protegidas.

## 3. Smoke test do System
- [ ] Login e logout.
- [ ] Relogin sem refresh.
- [ ] Home, Membros e Perfil.
- [ ] Requisições: Aula, Promoção e Demissão.
- [ ] Turnos: ligar, trocar posto e desligar.
- [ ] Documentos, Loja e Configurações.
- [ ] DPE Mail e Conversas.
- [ ] Rede DPE: publicar texto e imagem.
- [ ] Rede DPE: curtir/descurtir e comentar.
- [ ] Rede DPE: “Para você” e “Seguindo”.
- [ ] Rede DPE: seguir sugestão e abrir perfil.
- [ ] Badge de Mail e Central de Notificações.
- [ ] “Marcar todas como lidas”.
- [ ] Segurança e Saúde do System.

## 4. DPE Command
- [ ] Heartbeat aparece ONLINE.
- [ ] Processo online e conexão ao quarto são exibidos separadamente.
- [ ] Quarto e quantidade de usuários corretos.
- [ ] AutoTurno.
- [ ] Ausência normal e persistente.
- [ ] O.C.: `!setoc`.
- [ ] O.B.: `!setlocalob`, `!obset`, `!obdeset`.
- [ ] Guia: `!setlocalguia`.
- [ ] Locais de aluno: `!alunoset`.
- [ ] `!aula presentes` lista somente os alunos nos pontos do quarto atual.
- [ ] `!aula validar` identifica turma válida, nicks inexistentes e acessos revogados.
- [ ] Painel web “Validar participantes” confere aprovados/reprovados antes da postagem.
- [ ] `!guias` / `!syncguias` refletem autorizações atuais do System.
- [ ] PORTADOR autorizado como GUIA perde os poderes extras no DPE Command.
- [ ] Saúde do System mostra local do Guia, pontos de aluno, Guias e rascunhos.
- [ ] `!aula recuperar` reconcilia uma postagem pendente após reinício.
- [ ] Postagem de aula idempotente.
- [ ] Aprovado novo conclui verificação por missão, cria senha e entra como o mesmo Soldado sem duplicar perfil/histórico.
- [ ] Telegram administrativo.

## 5. Permissões e segurança
- [ ] MEMBRO não acessa funções administrativas.
- [ ] GUIA publica aula sem receber papel administrativo.
- [ ] MODERADOR não altera/promove/demite papel igual ou superior.
- [ ] ADMINISTRADOR gerencia Guias, Mail, segurança e estrutura.
- [ ] DONO não concede SUPREMO.
- [ ] SUPREMO mantém exceções documentadas.
- [ ] Troca/reset de senha revogam sessões anteriores.
- [ ] Banimento e demissão revogam sessões do alvo.
- [ ] CSP ativa e CORS restrito em produção.
- [ ] `/api/members`, `/api/system-health` e `/api/audit` recusam acesso sem autenticação.

## 6. Backup e recuperação
- [ ] Saúde do System mostra snapshots existentes.
- [ ] Checksum do backup mais recente existe.
- [ ] Restore foi ensaiado em ambiente de teste.
- [ ] Cópia `pre-restore-*.db` é criada antes de substituir banco ativo.

## 7. Encerramento
- [ ] Saúde do System mostra versão `3.0.0` ou superior.
- [ ] Banco e DPE Command sem erros recentes.
- [ ] QA visual desktop concluído.
- [ ] QA visual mobile concluído.

Versão estável atual: `3.0.0`.
