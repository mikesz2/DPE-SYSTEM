# Matriz de Permissões — System DPE

Esta matriz documenta a autorização **efetiva no backend**. O frontend pode esconder botões, mas a proteção real deve permanecer no servidor.

## Papéis do System

Ordem de privilégio:

`MEMBRO < MODERADOR < ADMINISTRADOR < DONO < SUPREMO`

| Ação | MEMBRO | MODERADOR | ADMINISTRADOR | DONO | SUPREMO |
|---|:---:|:---:|:---:|:---:|:---:|
| Ler membros, rankings, divisões, documentos e condecorações | ✓ | ✓ | ✓ | ✓ | ✓ |
| Iniciar/encerrar o próprio turno | ✓ | ✓ | ✓ | ✓ | ✓ |
| Criar requerimento | ✓ | ✓ | ✓ | ✓ | ✓ |
| Conversas, notificações, loja e DPE Mail recebido | ✓ | ✓ | ✓ | ✓ | ✓ |
| Publicar, curtir e comentar na Rede DPE | ✓ | ✓ | ✓ | ✓ | ✓ |
| Excluir publicação de outro militar na Rede DPE | — | ✓ | ✓ | ✓ | ✓ |
| Publicar aula com `lessonGuide=true` | ✓* | ✓ | ✓ | ✓ | ✓ |
| Publicar aula sendo AFD | ✓* | ✓ | ✓ | ✓ | ✓ |
| Decidir requerimentos | — | ✓ | ✓ | ✓ | ✓ |
| Criar/editar documentos | — | ✓ | ✓ | ✓ | ✓ |
| Criar/atualizar tarefas | — | ✓ | ✓ | ✓ | ✓ |
| Consultar logs de visitas | — | ✓ | ✓ | ✓ | ✓ |
| Promover militar inferior na hierarquia do System | — | ✓ | ✓ | ✓ | ✓ |
| Encerrar turno ativo de outro militar (correção) | — | — | — | — | ✓ |
| Demitir militar inferior | — | ✓ | ✓ | ✓ | ✓ |
| Alterar membro / patente / divisão / status | — | ✓** | ✓** | ✓** | ✓ |
| Ajustar Elite Coins | — | — | ✓** | ✓** | ✓ |
| Banir militar inferior | — | ✓ | ✓ | ✓ | ✓ |
| Cadastrar novo militar | — | — | ✓ | ✓ | ✓ |
| Desbanir militar | — | — | ✓ | ✓ | ✓ |
| Conceder/revogar condecoração | — | — | ✓ | ✓ | ✓ |
| Criar patente e divisão | — | — | ✓ | ✓ | ✓ |
| Enviar DPE Mail institucional | — | — | ✓ | ✓ | ✓ |
| Conceder/revogar Guia de aula | — | — | ✓ | ✓ | ✓ |
| Ver Auditoria e Segurança | — | — | ✓ | ✓ | ✓ |
| Ver Saúde do System | — | — | ✓ | ✓ | ✓ |
| Escolher patente manual em promoção | — | — | — | — | ✓ |
| Registrar promoção retroativa | — | — | — | — | ✓ |
| Editar/excluir histórico do perfil | — | — | — | — | ✓ |
| Conceder cargo SUPREMO | — | — | — | — | ✓ |

* A autorização de aula para MEMBRO não vem do papel; depende de `lessonGuide=true` ou divisão AFD.

** Um não-Supremo não pode conceder papel igual ou superior ao próprio. Ações disciplinares também respeitam hierarquia do alvo.

## Níveis do DPE Command

Os níveis abaixo pertencem ao bot do Habbo e **não substituem** os papéis do System:

| Nível do bot | Escopo |
|---|---|
| `GUIA` | Somente fluxo de postagem de aula, e apenas quando o mesmo militar possui `lessonGuide=true` no System |
| `PORTADOR` | Operação/moderação permitida pelo DPE Command e postagem de aula confiável |
| `ADMIN` | Configuração completa do DPE Command, locais, permissões e postagem de aula |

Regras importantes:

- `GUIA` não recebe automaticamente MODERADOR/ADMINISTRADOR no System.
- Conceder Guia é ação de ADMINISTRADOR ou superior no System.
- O DPE Command valida o token da integração antes de qualquer rota `/api/integrations/dpe/*`.
- Aulas postadas pelo bot ainda validam a autorização do professor no backend.
- Promoção, demissão, banimento e edição administrativa respeitam a hierarquia do papel do alvo; ninguém abaixo de SUPREMO pode agir sobre papel igual ou superior ao próprio.
- SUPREMO é o único papel com exceções explícitas para promoção retroativa, escolha manual de patente e edição/exclusão do histórico.
