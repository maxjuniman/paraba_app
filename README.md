# Paraba

Aplicativo Expo criado com a mesma base tecnica do projeto `Copa/Front`: Expo SDK 54, Expo Router, TypeScript estrito, `expo-secure-store`, `expo-updates`, `expo doctor` e suporte a EAS Update.

## Rodar

```bash
npm install
npm run doctor
npm run start
```

Configure a API em `.env`:

```bash
EXPO_PUBLIC_PARABA_API_URL=https://api.seudominio.com.br/api
```

## Fluxos implementados

- Login de usuario tipo 1 e tipo 2 autorizado.
- Cadastro de usuario tipo 2 para autorizacao pelo professor.
- Tela `Equipe` exclusiva para tipo 2, com foto, filtros por nome/categoria e nascimento com idade.
- Cadastro de aluno pelo professor.
- Edicao do aluno ao tocar no card da listagem.
- Foto opcional no cadastro de aluno, exibida no card do aluno.
- Data de nascimento obrigatoria no cadastro de aluno.
- Filtro de alunos por nome e categoria calculada por idade.
- Alerta na Home com aniversariantes do mes, dia e idade que fazem.
- Vinculo aluno/usuario preparado para a etapa futura do tipo 2.
- Atualizacao de data de pagamento por aluno.
- Filtro de pagamentos por `Pago`, `Em aberto` e `Em atraso`.
- Lista de presenca diaria com toque no aluno para marcar/desmarcar presenca.
- Resumo de presencas nas informacoes do aluno.
- Videos ficam desabilitados no momento.

As telas administrativas ficam visiveis apenas para usuarios tipo 1. A tela `Equipe` aparece apenas para usuarios tipo 2.

## Endpoints esperados

- `POST /auth/login`
- `POST /auth/register`
- `GET /equipe`
- `GET /alunos`
- `POST /alunos`
- `PATCH /alunos/:alunoId`
- `POST /alunos/:id/vincular-user`
- `PATCH /alunos/:id/pagamento`
- `GET /presencas?data=AAAA-MM-DD`
- `PATCH /presencas/:data/alunos/:alunoId/toggle`
- `GET /videos`
- `POST /videos`

## Categorias de alunos

Os limites ficam em `constants/StudentCategories.ts`:

- `kids`: 0 a 10 anos.
- `juvenil`: 11 a 18 anos.
- `adulto`: 19 anos ou mais.

## Expo Updates

O projeto ja inclui `expo-updates`, `runtimeVersion`, `updates.url` e verificacao OTA no layout raiz. Antes de publicar builds reais, rode `eas init` e substitua o `projectId`/`updates.url` placeholder em `app.json` pelo ID gerado pela Expo.
