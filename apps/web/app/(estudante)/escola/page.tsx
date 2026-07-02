'use client';
import { Card, Badge } from '@notaa/ui';
import { useUser } from '../../../lib/user-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EscolaHubPage() {
  const { role, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Redireciona alunos normais que tentarem forçar a URL
    if (!loading && role !== 'escola') {
      router.replace('/dashboard');
    }
  }, [role, loading, router]);

  if (loading || role !== 'escola') {
    return <div className="p-8 text-center text-text-muted">Verificando permissões...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4">
      <header className="space-y-2 border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-text flex items-center gap-3">
          Painel da Escola <Badge variant="brand">Institucional</Badge>
        </h1>
        <p className="text-text-muted">Acompanhe o desempenho geral das suas turmas e alunos.</p>
      </header>

      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
         <div className="text-6xl grayscale opacity-40">🏫</div>
         <h2 className="text-xl font-bold text-text">Módulo em Desenvolvimento</h2>
         <p className="text-sm text-text-muted max-w-md">
           Em breve você poderá visualizar relatórios consolidados, gerenciar turmas, agendar simulados globais e monitorar o engajamento da sua instituição.
         </p>
         <div className="mt-4 animate-pulse">
            <Badge variant="neutral">Disponível na próxima fase</Badge>
         </div>
      </div>
    </div>
  );
}
