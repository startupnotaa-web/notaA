'use client';
import { NotaA_Onboarding } from '../../components/NotaA_Onboarding';

export default function PreviewOnboarding() {
  return (
    <NotaA_Onboarding onComplete={(dados) => alert('Perfil Concluído!\\n' + JSON.stringify(dados, null, 2))} />
  );
}
