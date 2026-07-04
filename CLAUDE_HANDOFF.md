# CLAUDE_HANDOFF

1. **Stack & Regras**
- Next.js (App Router), NestJS, Supabase (Drizzle ORM), Gemini AI.
- UI: APENAS Tailwind CSS. Zero CSS inline ou arquivos de estilo extras. Preserve o design atual.

2. **Contexto**
- Navegação centralizada em 5 Hubs (Início, Trilha, Estudo, Arena, Perfil).
- DB atualizado com: lin, hum, nat, mat, red, fin, soc, art.
- Banco de questões reais populado no banco de dados.

3. **Tarefas Prioritárias (Bugs)**
- Estabilidade: Salvar aba ativa no localStorage sem causar Hydration Mismatch no Next.js (o sistema está resetando a tela no refresh).
- UI: Remover componentes `<TopBar/>` inseridos diretamente em páginas como "Trilhas". Centralizar exclusivamente no layout.tsx raiz.
- Quiz IA: Corrigir repetição de perguntas. O Backend deve forçar o Gemini a usar `responseMimeType: "application/json"`, passar dados do aluno para exigir questões inéditas, e parar de silenciar erros com mockups estáticos.
- Dashboard: Implementar refetch/reatividade no Mapa Cognitivo após resolução de questões.
