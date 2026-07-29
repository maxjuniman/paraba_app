import { api } from './api';
import type { AuthPayload, SessionUser } from '@/utils/session';

export type LoginBody = {
  email: string;
  senha: string;
};

export type RegisterBody = {
  nome: string;
  email: string;
  celular: string;
  senha: string;
  confirmacao_senha: string;
};

export type RegisterResponse = {
  message: string;
  user?: SessionUser;
};

export type AlunoBody = {
  nome: string;
  apelido?: string;
  emailResponsavel?: string;
  celular?: string;
  dataNascimento?: string;
  dataPagamento?: string;
  faixaAtual?: string;
  graus?: number;
};

export type Aluno = {
  id: string;
  nome: string;
  apelido?: string | null;
  emailResponsavel?: string;
  celular?: string;
  dataNascimento?: string;
  dataPagamento?: string | null;
  pagamentoPago?: boolean | null;
  pagamentoReferencia?: string | null;
  pagamentosPagos?: string[] | null;
  faixaAtual?: string | null;
  graus?: number | null;
  userId?: string | null;
  user?: Pick<SessionUser, 'id' | 'nome' | 'email' | 'ativo'> | null;
  presencas?: Presenca[];
  totalPresencas?: number;
  ultimaPresenca?: string | null;
  createdAt?: string;
};

export type Presenca = {
  id: string;
  alunoId: string;
  data: string;
  presente: boolean;
  markedAt: string;
  markedByUserId?: string | null;
};

export type PresencaDiaAluno = Aluno & {
  presente: boolean;
  presenca?: Presenca | null;
};

export type PresencaDia = {
  data: string;
  alunos: PresencaDiaAluno[];
};

export type PendingUser = SessionUser & {
  ativo: boolean;
};

export type AutorizarUserBody =
  | {
      alunoId: string;
      aluno?: never;
    }
  | {
      alunoId?: never;
      aluno: AlunoBody;
    };

export type PaymentDateBody = {
  alunoId: string;
  dataPagamento: string;
};

export type PaymentStatusBody = {
  alunoId: string;
  pago: boolean;
  referencia: string;
};

export type VideoUpdateBody = {
  titulo: string;
  descricao?: string;
  url: string;
  alunoId?: string;
};

export type VideoUpdate = {
  id: string;
  titulo: string;
  descricao?: string;
  url: string;
  alunoId?: string | null;
  createdAt?: string;
};

type RawAuthPayload = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: SessionUser;
  usuario?: SessionUser;
  data?: RawAuthPayload;
};

function unwrapData<T>(data: T | { data?: T }): T {
  if (data && typeof data === 'object' && 'data' in data && data.data) {
    return data.data;
  }

  return data as T;
}

function normalizeAuthPayload(data: RawAuthPayload): AuthPayload {
  const root = data.data ?? data;
  const accessToken = root.accessToken ?? root.access_token ?? root.token;
  const user = root.user ?? root.usuario;

  if (!accessToken || !user) {
    throw new Error('Resposta de autenticacao invalida.');
  }

  return {
    accessToken,
    refreshToken: root.refreshToken ?? root.refresh_token,
    user,
  };
}

export const parabaService = {
  async login(body: LoginBody): Promise<AuthPayload> {
    const { data } = await api.post<RawAuthPayload>('/auth/login', body);
    return normalizeAuthPayload(data);
  },

  async cadastro(body: RegisterBody): Promise<RegisterResponse> {
    const { data } = await api.post<RegisterResponse>('/auth/register', body);
    return data;
  },

  async listarUsuariosPendentes(): Promise<PendingUser[]> {
    const { data } = await api.get<{ data?: PendingUser[] } | PendingUser[]>('/users/pendentes');
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async autorizarUsuario(userId: string, body: AutorizarUserBody): Promise<{ user: PendingUser; aluno: Aluno }> {
    const payload =
      'alunoId' in body
        ? { aluno_id: body.alunoId }
        : {
            aluno: body.aluno,
          };
    const { data } = await api.post<{ data?: { user: PendingUser; aluno: Aluno } } | { user: PendingUser; aluno: Aluno }>(
      `/users/${userId}/autorizar`,
      payload
    );
    return unwrapData<{ user: PendingUser; aluno: Aluno }>(data);
  },

  async listarAlunos(): Promise<Aluno[]> {
    const { data } = await api.get<{ data?: Aluno[] } | Aluno[]>('/alunos');
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async cadastrarAluno(body: AlunoBody): Promise<Aluno> {
    const { data } = await api.post<{ data?: Aluno } | Aluno>('/alunos', body);
    return unwrapData<Aluno>(data);
  },

  async vincularAlunoUser(alunoId: string, userId: string): Promise<Aluno> {
    const { data } = await api.post<{ data?: Aluno } | Aluno>(`/alunos/${alunoId}/vincular-user`, {
      user_id: userId,
    });
    return unwrapData<Aluno>(data);
  },

  async atualizarDataPagamento(body: PaymentDateBody): Promise<Aluno> {
    const { data } = await api.patch<{ data?: Aluno } | Aluno>(`/alunos/${body.alunoId}/pagamento`, {
      data_pagamento: body.dataPagamento,
    });
    return unwrapData<Aluno>(data);
  },

  async atualizarStatusPagamento(body: PaymentStatusBody): Promise<Aluno> {
    const { data } = await api.patch<{ data?: Aluno } | Aluno>(`/alunos/${body.alunoId}/pagamento-status`, {
      pago: body.pago,
      referencia: body.referencia,
    });
    return unwrapData<Aluno>(data);
  },

  async desativarUsuarioAluno(alunoId: string): Promise<Aluno> {
    const { data } = await api.patch<{ data?: Aluno } | Aluno>(`/alunos/${alunoId}/desativar-user`);
    return unwrapData<Aluno>(data);
  },

  async listarPresencas(dataPresenca: string): Promise<PresencaDia> {
    const { data } = await api.get<{ data?: PresencaDia } | PresencaDia>('/presencas', {
      params: { data: dataPresenca },
    });
    return unwrapData<PresencaDia>(data);
  },

  async alternarPresenca(dataPresenca: string, alunoId: string): Promise<{ aluno: PresencaDiaAluno; presenca: Presenca }> {
    const { data } = await api.patch<
      { data?: { aluno: PresencaDiaAluno; presenca: Presenca } } | { aluno: PresencaDiaAluno; presenca: Presenca }
    >(`/presencas/${dataPresenca}/alunos/${alunoId}/toggle`);
    return unwrapData<{ aluno: PresencaDiaAluno; presenca: Presenca }>(data);
  },

  async listarVideos(): Promise<VideoUpdate[]> {
    const { data } = await api.get<{ data?: VideoUpdate[] } | VideoUpdate[]>('/videos');
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async publicarVideo(body: VideoUpdateBody): Promise<VideoUpdate> {
    const { data } = await api.post<{ data?: VideoUpdate } | VideoUpdate>('/videos', {
      titulo: body.titulo,
      descricao: body.descricao,
      url: body.url,
      aluno_id: body.alunoId,
    });
    return unwrapData<VideoUpdate>(data);
  },
};
