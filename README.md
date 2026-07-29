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

- Login e cadastro de usuario.
- Cadastro de aluno pelo professor.
- Vinculo aluno/usuario via `aluno_id` enviado no cadastro do usuario.
- Atualizacao de data de pagamento por aluno.
- Lista de presenca diaria com toque no aluno para marcar/desmarcar presenca.
- Resumo de presencas nas informacoes do aluno.
- Publicacao e listagem de atualizacoes em video.

## Endpoints esperados

- `POST /auth/login`
- `POST /auth/register`
- `GET /alunos`
- `POST /alunos`
- `POST /alunos/:id/vincular-user`
- `PATCH /alunos/:id/pagamento`
- `GET /presencas?data=AAAA-MM-DD`
- `PATCH /presencas/:data/alunos/:alunoId/toggle`
- `GET /videos`
- `POST /videos`

## Expo Updates

O projeto ja inclui `expo-updates`, `runtimeVersion`, `updates.url` e verificacao OTA no layout raiz. Antes de publicar builds reais, rode `eas init` e substitua o `projectId`/`updates.url` placeholder em `app.json` pelo ID gerado pela Expo.
