# Publicação na Discloud

O System DPE usa o repositório `muxcodes/System_DPE`, branch `main`, com `discloud.config` na raiz.

## Publicação

1. Conecte o GitHub à Discloud com acesso ao repositório `System_DPE`.
2. Use **Upload → GitHub** e selecione a branch `main`.
3. Configure as variáveis de ambiente abaixo no painel.
4. Publique/reinicie a aplicação sem excluir o banco persistente.
5. Confira `/health` e depois abra o domínio público.
6. Após alterações visuais grandes, use **Ctrl + F5** no navegador para descartar CSS/JS em cache.

## Variáveis

| Variável | Valor / orientação |
| --- | --- |
| `JWT_SECRET` | Chave aleatória de pelo menos 32 caracteres e mantida entre deploys. |
| `HABBO_BOOTSTRAP_ADMIN` | Nick exato da conta proprietária no Habbo. |
| `HABBO_DOMAIN` | `habbo.com.br`. |
| `CORS_ORIGIN` | Domínio público exato do System, por exemplo `https://systemdpe.com`. |
| `NODE_ENV` | `production`. |
| `PORT` | `8080`. |
| `DPE_COMMAND_API_TOKEN` | Token aleatório compartilhado somente com o DPE Command, com pelo menos 32 caracteres. |
| `DATABASE_BACKUP_KEEP` | Quantidade de snapshots pré-migração mantidos em `data/backups/` (3–60, padrão 14). |
| `SECURITY_LOG_RETENTION_DAYS` | Ex.: `90`. |
| `SECURITY_LOG_MAX_EVENTS` | Ex.: `50000`. |
| `DISCLOUD_PROXY_CIDRS` | Apenas se houver faixas adicionais de proxy fornecidas pela hospedagem. |

Nunca salve `JWT_SECRET`, `DPE_COMMAND_API_TOKEN` ou tokens do Telegram no repositório.

## Inicialização

`npm start` executa `backend/scripts/discloud.js`. O script:

1. valida as variáveis obrigatórias;
2. cria/preserva `data/system-dpe.db`;
3. executa `prisma generate`;
4. executa `prisma db push --skip-generate`;
5. aplica migrações auxiliares de cargos;
6. executa o seed somente quando necessário;
7. inicia o servidor em `0.0.0.0`.

O processo não deve apagar o banco para atualizar código.

## Banco e backup

O banco de produção fica em:

```text
data/system-dpe.db
```

Antes de cada `prisma db push`, o bootstrap da Discloud executa automaticamente um checkpoint do SQLite e cria um snapshot consistente em:

```text
data/backups/system-dpe-<data-hora>.db
```

Cada snapshot recebe um arquivo `.sha256` para conferência de integridade. A retenção é controlada por `DATABASE_BACKUP_KEEP` e, por padrão, mantém os 14 backups mais recentes.

Backup manual:

```bash
npm run backup
```

Restauração controlada — execute com o processo web parado:

```bash
CONFIRM_RESTORE=YES npm run restore -- data/backups/system-dpe-AAAA_MM_DD-HH-MM-SS.db
```

O restore confere o SHA-256 quando o sidecar existe, executa `PRAGMA integrity_check` e cria uma cópia `pre-restore-*.db` antes de substituir o banco ativo.

Esses snapshots protegem upgrades e reinícios, mas não substituem uma cópia externa da pasta `data/` antes de excluir/recriar a aplicação ou o volume persistente. A marca `data/.seeded` impede seed repetido em reinicializações normais.

## DPE Command

O bot não é iniciado junto do site. A pasta `dpe-command/` está em `.discloudignore` para não fazer parte do deploy web.

No ambiente em que o DPE Command roda:

```text
SYSTEM_API_URL=https://systemdpe.com
SYSTEM_DPE_TOKEN=<mesmo valor de DPE_COMMAND_API_TOKEN da Discloud>
```

O token deve ser trocado nos dois lados sempre que houver suspeita de exposição.

## Verificação

Teste local da inicialização:

```bash
node --test backend/scripts/discloud.test.js
```

Suíte completa:

```bash
npm test
```

Em cada push/pull request para `main`, o GitHub Actions também executa a suíte e valida a sintaxe de `dpe-command/dpe_command.py`.

## Atualização segura

Para atualizar:

1. confirme backup do banco;
2. faça merge na `main`;
3. mande a Discloud atualizar/reiniciar a aplicação;
4. confira os logs de inicialização;
5. abra `/health`;
6. execute `SYSTEM_URL=https://seu-dominio npm run deploy:check` — ele valida `/health`, a versão esperada e o bundle da Rede DPE;
7. confira **Saúde do System**: banco, snapshots, DPE Command e versão;
8. teste login, Home, Turnos, Requisições/Aulas e Perfil;
9. siga `RELEASE_CHECKLIST.md` antes de promover um Release Candidate;
10. só depois considere o deploy concluído.
