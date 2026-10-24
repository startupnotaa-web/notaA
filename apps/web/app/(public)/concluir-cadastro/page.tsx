'use client';

// Conta com sessão e sem papel: o cadastro não terminou. Esta é a ÚNICA tela possível nesse estado
// (além de /login e sair). Nunca leva a /dashboard nem a qualquer painel. O que aparece depende do
// motivo pelo qual o registro não terminou (lib/registro.ts).
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { semRotulo, type ContextoListado, type TipoPerfilPublico } from '@notaa/contracts';
import { Button, Notice, OptionCard, Panel, TextField } from '@notaa/ui';
import { AuthPagina } from '../../components/auth';
import { EscolherContexto } from '../../components/EscolherContexto';
import { TelaCarregando } from '../../components/TelaCarregando';
import { useAuth } from '../../../lib/auth-context';
import { caminhoInternoSeguro } from '../../../lib/destino';
import { confirmarContexto, prepararEntrada, type Entrada } from '../../../lib/entrada';
import { registrarComo, type MotivoDaFalha } from '../../../lib/post-auth';

const EMAIL_SUPORTE = process.env.NEXT_PUBLIC_EMAIL_SUPORTE;

type Fase =
  | { fase: 'tentando' }
  | { fase: 'falhou'; motivo: MotivoDaFalha }
  | { fase: 'escolher-acesso'; entrada: Extract<Entrada, { tipo: 'escolher' }> };

const TIPOS: ReadonlyArray<{ tipo: TipoPerfilPublico; titulo: string; descricao: string }> = [
  { tipo: 'estudante', titulo: 'Aluno', descricao: 'Estudo para o ENEM e acompanho meu progresso.' },
  { tipo: 'professor_independente', titulo: 'Professor', descricao: 'Crio turmas e acompanho meus alunos.' },
  { tipo: 'instituicao', titulo: 'Instituição', descricao: 'Administro uma escola ou faculdade.' },
];

function Suporte() {
  return EMAIL_SUPORTE ? (
    <>
      escreva para{' '}
      <a href={`mailto:${EMAIL_SUPORTE}`} className="font-bold text-primary underline">
        {EMAIL_SUPORTE}
      </a>
    </>
  ) : (
    <>fale com o suporte do Nota A pelo contato do site</>
  );
}

function Concluir() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, loading, signOut } = useAuth();
  const next = caminhoInternoSeguro(params.get('next'));
  const viaConvite = !!session?.user.user_metadata?.tokenConviteProfessor;

  const [estado, setEstado] = useState<Fase>({ fase: 'tentando' });
  const [tipo, setTipo] = useState<TipoPerfilPublico>('estudante');
  const [nomeInstituicao, setNomeInstituicao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erroDoFormulario, setErroDoFormulario] = useState<string | null>(null);
  const jaTentou = useRef(false);

  const aplicar = useCallback(
    (entrada: Entrada) => {
      if (entrada.tipo === 'ir') router.replace(entrada.destino);
      else if (entrada.tipo === 'escolher') setEstado({ fase: 'escolher-acesso', entrada });
      else if (entrada.tipo === 'sem-papel') setEstado({ fase: 'falhou', motivo: entrada.motivo });
      // 'conta-inativa': quem reage é o provedor de acesso (sai da sessão e leva ao login).
    },
    [router],
  );

  const tentar = useCallback(() => {
    setEstado({ fase: 'tentando' });
    setErroDoFormulario(null);
    void prepararEntrada(next, { aposRegistro: true })
      .then(aplicar)
      .catch(() => setEstado({ fase: 'falhou', motivo: 'indisponivel' }));
  }, [aplicar, next]);

  useEffect(() => {
    if (loading || jaTentou.current) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    jaTentou.current = true;
    tentar();
  }, [loading, session, router, tentar]);

  async function concluirComTipo(e: React.FormEvent) {
    e.preventDefault();
    if (tipo === 'instituicao' && nomeInstituicao.trim().length < 2) {
      setErroDoFormulario('Informe o nome da instituição.');
      return;
    }
    setEnviando(true);
    setErroDoFormulario(null);
    const r = await registrarComo(tipo, tipo === 'instituicao' ? nomeInstituicao.trim() : undefined);
    setEnviando(false);
    if (r.ok) {
      tentar();
    } else if (r.motivo === 'conflito' || r.motivo === 'sessao') {
      setEstado({ fase: 'falhou', motivo: r.motivo });
    } else {
      setErroDoFormulario(
        r.motivo === 'indisponivel'
          ? 'Estamos com um problema agora. Tente de novo em alguns minutos.'
          : 'Não foi possível concluir com esses dados. Confira e tente de novo.',
      );
    }
  }

  if (estado.fase === 'tentando') return <TelaCarregando rotulo="Concluindo o seu cadastro" />;

  if (estado.fase === 'escolher-acesso') {
    const { entrada } = estado;
    return (
      <EscolherContexto
        contextos={entrada.contextos}
        lembrado={entrada.lembrado}
        aoEscolher={async (c: ContextoListado) => {
          await confirmarContexto(entrada.authUid, semRotulo(c), entrada.contextos);
          router.replace(entrada.destino);
        }}
      />
    );
  }

  const { motivo } = estado;
  const sair = (
    <Button type="button" variant="secondary" onClick={() => void signOut().then(() => router.replace('/login'))}>
      Sair da conta
    </Button>
  );

  if (motivo === 'conflito') {
    return (
      <AuthPagina titulo="Não foi possível ligar o seu cadastro">
        <Notice tone="danger">
          Este e-mail já tem um cadastro no Nota A que não conseguimos ligar a esta conta. Para resolver, <Suporte />. Diga
          o e-mail que você usou.
        </Notice>
        <div className="flex flex-wrap gap-space-3">{sair}</div>
      </AuthPagina>
    );
  }

  if (motivo === 'sessao') {
    return (
      <AuthPagina titulo="Sua sessão expirou" descricao="Entre de novo para concluir o cadastro.">
        <div className="flex flex-wrap gap-space-3">{sair}</div>
      </AuthPagina>
    );
  }

  if (motivo === 'indisponivel') {
    return (
      <AuthPagina
        titulo="Não conseguimos concluir agora"
        descricao="Estamos com um problema. Sua conta está salva; tente de novo em alguns minutos."
      >
        <div className="flex flex-wrap gap-space-3">
          <Button type="button" variant="primary" onClick={tentar}>
            Tentar de novo
          </Button>
          {sair}
        </div>
      </AuthPagina>
    );
  }

  if (motivo === 'invalido' && viaConvite) {
    return (
      <AuthPagina titulo="Este convite não pôde ser usado">
        <Notice tone="danger">
          O link pode ter expirado ou já ter sido usado. Peça um novo link à instituição e abra-o de novo.
        </Notice>
        <div className="flex flex-wrap gap-space-3">{sair}</div>
      </AuthPagina>
    );
  }

  // 'sem-tipo' (a conta não disse o que é) ou 'invalido' (os dados do cadastro não foram aceitos).
  return (
    <AuthPagina
      titulo="Concluir cadastro"
      descricao="Falta só um passo: diga como você vai usar o Nota A. Dá para escolher agora e mudar de conta depois."
    >
      <Panel>
        <form onSubmit={concluirComTipo} className="flex flex-col gap-space-5">
          <div role="radiogroup" aria-label="Tipo de conta" className="flex flex-col gap-space-3">
            {TIPOS.map((t) => (
              <OptionCard
                key={t.tipo}
                selected={tipo === t.tipo}
                title={t.titulo}
                description={t.descricao}
                onClick={() => setTipo(t.tipo)}
                disabled={enviando}
              />
            ))}
          </div>
          {tipo === 'instituicao' ? (
            <TextField
              label="Nome da instituição"
              autoComplete="organization"
              value={nomeInstituicao}
              onChange={(e) => setNomeInstituicao(e.target.value)}
              required
            />
          ) : null}
          {erroDoFormulario ? <Notice tone="danger">{erroDoFormulario}</Notice> : null}
          <Button type="submit" variant="primary" className="w-full" loading={enviando}>
            {enviando ? 'Concluindo' : 'Concluir cadastro'}
          </Button>
        </form>
      </Panel>
      <div className="flex flex-wrap gap-space-3">{sair}</div>
    </AuthPagina>
  );
}

export default function ConcluirCadastroPage() {
  return (
    <Suspense fallback={<TelaCarregando />}>
      <Concluir />
    </Suspense>
  );
}
