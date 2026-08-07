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
  foto?: string;
  emailResponsavel?: string;
  nomeResponsavel?: string;
  celular: string;
  dataNascimento: string;
  dataPagamento?: string;
  faixaAtual?: string;
  graus?: number;
};

export type Aluno = {
  id: string;
  nome: string;
  apelido?: string | null;
  foto?: string | null;
  emailResponsavel?: string;
  nomeResponsavel?: string | null;
  celular?: string;
  dataNascimento?: string;
  dataPagamento?: string | null;
  pagamentoPago?: boolean | null;
  pagamentoReferencia?: string | null;
  pagamentosPagos?: string[] | null;
  faixaAtual?: string | null;
  graus?: number | null;
  ativo?: boolean;
  userId?: string | null;
  user?: Pick<SessionUser, 'id' | 'nome' | 'email' | 'ativo'> | null;
  cadastroAppAt?: string | null;
  presencas?: Presenca[];
  totalPresencas?: number;
  ultimaPresenca?: string | null;
  createdAt?: string;
};

export type EquipeAluno = Pick<Aluno, 'id' | 'nome' | 'apelido' | 'foto' | 'dataNascimento' | 'faixaAtual' | 'graus'> & {
  isMe?: boolean;
  dataPagamento?: string | null;
  pagamentoPago?: boolean | null;
  pagamentoReferencia?: string | null;
  pagamentosPagos?: string[] | null;
  createdAt?: string;
  cadastroAppAt?: string | null;
};

export type MeuAluno = EquipeAluno &
  Pick<Aluno, 'dataPagamento' | 'pagamentoPago' | 'pagamentoReferencia' | 'pagamentosPagos' | 'createdAt' | 'cadastroAppAt'>;

export type Depoimento = {
  id: string;
  nome: string;
  texto: string;
  faixa?: string | null;
  userId?: string | null;
  ativo: boolean;
  ordem: number;
  createdAt?: string;
};

export type Presenca = {
  id: string;
  alunoId: string;
  data: string;
  aulaId?: string | null;
  presente: boolean;
  markedAt: string;
  markedByUserId?: string | null;
};

export type PresencaDiaAluno = Aluno & {
  presente: boolean;
  presentePorAula?: Record<string, boolean>;
  presenca?: Presenca | null;
};

export type AulaCategoria = 'kids' | 'juvenil' | 'adulto';
export type AulaRecorrencia = 'avulsa' | 'recorrente';

export type PresencaAulaDoDia = {
  aulaId: string;
  hora: string;
  categorias: AulaCategoria[];
  tipoAula: {
    id: string;
    nome: string;
  };
};

export type PresencaDia = {
  data: string;
  aulas: PresencaAulaDoDia[];
  aulaSelecionada?: PresencaAulaDoDia | null;
  alunos: PresencaDiaAluno[];
};

export type PendingUser = SessionUser & {
  ativo: boolean;
};

export type VinculoAlunoResumo = {
  id: string;
  nome: string;
  apelido?: string | null;
  celular?: string;
  ativo?: boolean;
  faixaAtual?: string | null;
  primario?: boolean;
};

export type UsuarioAtivoComVinculos = PendingUser & {
  alunos: VinculoAlunoResumo[];
  alunosCount: number;
  maxAlunos: number;
};

export type VinculosUsuario = {
  user: PendingUser;
  alunos: VinculoAlunoResumo[];
  alunoPrimarioId: string | null;
  maxAlunos: number;
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

export type TipoAula = {
  id: string;
  nome: string;
  createdAt: string;
};

export type AulaCalendarioBody = {
  tipoAulaId?: string;
  novoTipoAula?: string;
  recorrencia: AulaRecorrencia;
  diasSemana?: number[];
  data?: string;
  hora: string;
  categorias: AulaCategoria[];
};

export type AulaCalendario = {
  id: string;
  tipoAulaId: string;
  tipoAulaNome: string;
  diasSemana: number[];
  hora: string;
  categorias: AulaCategoria[];
  recorrencia: AulaRecorrencia;
  dataUnica?: string | null;
  createdAt: string;
};

export type AulaCalendarioMes = {
  id: string;
  aulaId: string;
  data: string;
  diaSemana: number;
  hora: string;
  categorias: AulaCategoria[];
  recorrencia?: AulaRecorrencia;
  tipoAula: Pick<TipoAula, 'id' | 'nome'>;
  presentes?: {
    id: string;
    nome: string;
    apelido?: string | null;
  }[];
  totalPresentes?: number;
};

export type CalendarioMes = {
  mes: string;
  aulas: AulaCalendarioMes[];
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

  async obterMeuPerfil(): Promise<SessionUser> {
    const { data } = await api.get<{ data?: SessionUser } | SessionUser>('/auth/me');
    return unwrapData<SessionUser>(data);
  },

  async atualizarMeuPerfil(body: {
    nome: string;
    celular?: string;
    senhaAtual?: string;
    novaSenha?: string;
  }): Promise<SessionUser> {
    const { data } = await api.patch<{ data?: SessionUser } | SessionUser>('/auth/me', body);
    return unwrapData<SessionUser>(data);
  },

  async listarUsuariosPendentes(): Promise<PendingUser[]> {
    const { data } = await api.get<{ data?: PendingUser[] } | PendingUser[]>('/users/pendentes');
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async listarUsuariosAtivos(): Promise<UsuarioAtivoComVinculos[]> {
    const { data } = await api.get<{ data?: UsuarioAtivoComVinculos[] } | UsuarioAtivoComVinculos[]>(
      '/users/ativos'
    );
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async listarAlunosDoUsuario(userId: string): Promise<VinculosUsuario> {
    const { data } = await api.get<{ data?: VinculosUsuario } | VinculosUsuario>(
      `/users/${userId}/alunos`
    );
    return unwrapData<VinculosUsuario>(data);
  },

  async definirAlunoPrimario(userId: string, alunoId: string): Promise<VinculosUsuario> {
    const { data } = await api.patch<{ data?: VinculosUsuario } | VinculosUsuario>(
      `/users/${userId}/aluno-primario`,
      { aluno_id: alunoId }
    );
    return unwrapData<VinculosUsuario>(data);
  },

  async listarMeusAlunosVinculados(): Promise<VinculosUsuario> {
    const { data } = await api.get<{ data?: VinculosUsuario } | VinculosUsuario>('/equipe/meus-alunos');
    return unwrapData<VinculosUsuario>(data);
  },

  async definirMeuAlunoPrimario(alunoId: string): Promise<VinculosUsuario> {
    const { data } = await api.patch<{ data?: VinculosUsuario } | VinculosUsuario>(
      '/equipe/me/aluno-primario',
      { aluno_id: alunoId }
    );
    return unwrapData<VinculosUsuario>(data);
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

  async cadastrarProfessor(body: {
    nome: string;
    email: string;
    celular?: string;
    senha: string;
    confirmacao_senha: string;
  }): Promise<SessionUser> {
    const { data } = await api.post<{ data?: SessionUser; message?: string } | SessionUser>('/users/professores', body);
    return unwrapData<SessionUser>(data);
  },

  async listarAlunos(): Promise<Aluno[]> {
    const { data } = await api.get<{ data?: Aluno[] } | Aluno[]>('/alunos');
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async listarEquipe(): Promise<EquipeAluno[]> {
    const { data } = await api.get<{ data?: EquipeAluno[] } | EquipeAluno[]>('/equipe');
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async obterMeuAluno(): Promise<MeuAluno> {
    const { data } = await api.get<{ data?: MeuAluno } | MeuAluno>('/equipe/me');
    return unwrapData<MeuAluno>(data);
  },

  async atualizarMinhaFotoEquipe(foto: string | null, alunoId?: string): Promise<EquipeAluno> {
    const { data } = await api.patch<{ data?: EquipeAluno } | EquipeAluno>('/equipe/me/foto', {
      foto,
      ...(alunoId ? { aluno_id: alunoId } : {}),
    });
    return unwrapData<EquipeAluno>(data);
  },

  async listarTiposAula(): Promise<TipoAula[]> {
    const { data } = await api.get<{ data?: TipoAula[] } | TipoAula[]>('/calendario/tipos');
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async listarCalendarioMes(mes: string): Promise<CalendarioMes> {
    const { data } = await api.get<{ data?: CalendarioMes } | CalendarioMes>('/calendario', {
      params: { mes },
    });
    return unwrapData<CalendarioMes>(data);
  },

  async cadastrarAulaCalendario(body: AulaCalendarioBody): Promise<AulaCalendario> {
    const { data } = await api.post<{ data?: AulaCalendario } | AulaCalendario>('/calendario/aulas', body);
    return unwrapData<AulaCalendario>(data);
  },

  async cadastrarAluno(body: AlunoBody): Promise<Aluno> {
    const { data } = await api.post<{ data?: Aluno } | Aluno>('/alunos', body);
    return unwrapData<Aluno>(data);
  },

  async atualizarAluno(alunoId: string, body: AlunoBody): Promise<Aluno> {
    const { data } = await api.patch<{ data?: Aluno } | Aluno>(`/alunos/${alunoId}`, body);
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

  async atualizarStatusAluno(alunoId: string, ativo: boolean): Promise<Aluno> {
    const { data } = await api.patch<{ data?: Aluno } | Aluno>(`/alunos/${alunoId}/ativo`, { ativo });
    return unwrapData<Aluno>(data);
  },

  async desvincularAlunoUser(alunoId: string): Promise<Aluno> {
    const { data } = await api.post<{ data?: Aluno } | Aluno>(`/alunos/${alunoId}/desvincular-user`);
    return unwrapData<Aluno>(data);
  },

  async excluirAluno(alunoId: string): Promise<{ id: string; nome: string }> {
    const { data } = await api.delete<{ data?: { id: string; nome: string } } | { id: string; nome: string }>(
      `/alunos/${alunoId}`
    );
    return unwrapData<{ id: string; nome: string }>(data);
  },

  async alterarSenhaAluno(
    alunoId: string,
    body: { senha: string; confirmacao_senha: string }
  ): Promise<{ alunoId: string; userId: string; email: string }> {
    const { data } = await api.patch<
      | { data?: { alunoId: string; userId: string; email: string }; message?: string }
      | { alunoId: string; userId: string; email: string }
    >(`/alunos/${alunoId}/senha`, body);
    return unwrapData<{ alunoId: string; userId: string; email: string }>(data);
  },

  async salvarPushToken(token: string): Promise<void> {
    await api.put('/devices/push-token', { token });
  },

  async listarPresencas(dataPresenca: string, aulaId?: string): Promise<PresencaDia> {
    const { data } = await api.get<{ data?: PresencaDia } | PresencaDia>('/presencas', {
      params: {
        data: dataPresenca,
        ...(aulaId ? { aulaId } : {}),
      },
    });
    return unwrapData<PresencaDia>(data);
  },

  async alternarPresenca(
    dataPresenca: string,
    aulaId: string,
    alunoId: string
  ): Promise<{ aluno: PresencaDiaAluno; presenca: Presenca }> {
    const { data } = await api.patch<
      { data?: { aluno: PresencaDiaAluno; presenca: Presenca } } | { aluno: PresencaDiaAluno; presenca: Presenca }
    >(`/presencas/${dataPresenca}/aulas/${aulaId}/alunos/${alunoId}/toggle`);
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

  async obterMeuDepoimento(): Promise<Depoimento | null> {
    const { data } = await api.get<{ data?: Depoimento | null }>('/depoimentos/me');
    return data?.data ?? null;
  },

  async salvarMeuDepoimento(texto: string): Promise<Depoimento> {
    const { data } = await api.put<{ data?: Depoimento } | Depoimento>('/depoimentos/me', { texto });
    return unwrapData<Depoimento>(data);
  },

  async listarDepoimentos(): Promise<Depoimento[]> {
    const { data } = await api.get<{ data?: Depoimento[] } | Depoimento[]>('/depoimentos');
    return Array.isArray(data) ? data : data.data ?? [];
  },

  async atualizarDepoimento(
    id: string,
    body: Partial<{ nome: string; texto: string; faixa: string | null; ativo: boolean; ordem: number }>
  ): Promise<Depoimento> {
    const { data } = await api.patch<{ data?: Depoimento } | Depoimento>(`/depoimentos/${id}`, body);
    return unwrapData<Depoimento>(data);
  },

  async excluirDepoimento(id: string): Promise<void> {
    await api.delete(`/depoimentos/${id}`);
  },
};
