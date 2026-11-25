// Curva XP→nível não-linear (Q-05).
// Nível 1: 0 a 100 XP
// Nível 2: 101 a 250 XP
// Nível 3: 251 a 500 XP
// Pós Nível 3: dobramos o tamanho do bloco de XP necessário.
export function nivelDeXp(xpTotal: number): number {
  if (xpTotal < 0) return 1;
  if (xpTotal <= 100) return 1;
  if (xpTotal <= 250) return 2;
  if (xpTotal <= 500) return 3;
  
  let nivel = 3;
  let limite = 500;
  let incremento = 500;
  
  while (xpTotal > limite) {
    nivel++;
    limite += incremento;
    incremento *= 2;
  }
  
  return nivel;
}

/** Retorna os detalhes do nível atual (XP no nível e quanto falta pro próximo). */
export function calcularProgressaoNivel(xpTotal: number) {
  if (xpTotal < 0) xpTotal = 0;
  const atual = nivelDeXp(xpTotal);
  
  let limiteAnterior = 0;
  let proximoLimite = 100;
  
  if (atual === 2) {
    limiteAnterior = 100;
    proximoLimite = 250;
  } else if (atual === 3) {
    limiteAnterior = 250;
    proximoLimite = 500;
  } else if (atual > 3) {
    limiteAnterior = 500;
    let incremento = 500;
    for (let i = 4; i <= atual; i++) {
      proximoLimite = limiteAnterior + incremento;
      if (i < atual) {
        limiteAnterior = proximoLimite;
        incremento *= 2;
      }
    }
  }

  const xpParaProximoNivel = proximoLimite - limiteAnterior;
  const xpNoNivel = xpTotal - limiteAnterior;
  const progresso = xpNoNivel / xpParaProximoNivel;

  return {
    atual,
    xpNoNivel,
    xpParaProximoNivel,
    progresso,
    naoCalibrado: false,
  };
}
