# CLAUDE_HANDOFF.md

## ⚙️ Tech Stack & Arquitetura

Este é um projeto **Monorepo** focado em educação gamificada, dividido em:
- **Frontend**: Next.js (App Router) utilizando React, Tailwind CSS e componentes próprios do Design System.
- **Backend**: NestJS, estruturado de forma modular.
- **Banco de Dados**: PostgreSQL gerenciado via Supabase, utilizando **Drizzle ORM** para as migrações e consultas.
- **IA (Inteligência Artificial)**: Google Gemini via `@google/generative-ai`.

## 🏗️ Estado Atual do Projeto

- **Frontend (Navegação)**: A navegação foi estruturada em 5 Hubs Principais de aprendizado e gamificação:
  - Início
  - Trilha
  - Estudo
  - Arena
  - Perfil
- **Banco de Dados**: O sistema de progressão, simulados e estatísticas já suporta integralmente as seguintes áreas do conhecimento:
  - `lin` (Linguagens)
  - `hum` (Humanas)
  - `nat` (Natureza)
  - `mat` (Matemática)
  - `red` (Redação)
  - `fin` (Educação Financeira)
  - `soc` (Socioemocional)
  - `art` (Artes)

## 🎯 Próximas Missões (O que você deve fazer)

Siga estas missões na ordem e com cautela, pois o projeto já possui uma base sólida funcionando.

### Missão 1 (Backend/IA): Refatoração do Quiz com IA
- **O Problema**: Há um bug de repetição no Quiz com IA e o retorno não está sendo adaptativo. Em falhas silenciosas, o sistema cai num fallback.
- **Sua Tarefa**:
  - Consertar o bug de repetição do Quiz.
  - O backend **precisa** enviar o nível/XP atual do aluno (em cada área específica) como contexto no prompt do Gemini, para que a IA se adapte ao usuário.
  - Exigir um formato JSON rigoroso na resposta da API configurando `responseMimeType: "application/json"`.
  - Retornar erros reais (HTTP 400/500) caso a IA falhe (timeout, bad request, erro de parse JSON). Remova lógicas de fallback silencioso e os mocks de perguntas hardcoded (SAMPLE_Q). O frontend já está preparado para exibir o Toast de erro.

### Missão 2 (Backend/Simulado): Banco de Questões do ENEM
- **O Problema**: O Simulado Adaptativo está gerando questões com IA, mas queremos utilizar um banco real.
- **Sua Tarefa**:
  - Implementar a extração do banco de questões do `enem-extractor` (atualmente mapeado).
  - O Simulado Adaptativo deve parar completamente de gerar questões com IA.
  - Ele deve passar a fazer `SELECT` diretamente na tabela `questoes_enem` do banco de dados.
  - A consulta deve ser baseada e filtrada pelo nível de proficiência atual do aluno (fácil, médio, difícil).

### Missão 3 (Gamificação): Lógica de Ofensiva (Streak)
- **O Problema**: Precisamos expandir os recursos de gamificação baseados na assiduidade do estudante.
- **Sua Tarefa**:
  - Implementar a lógica de Ofensiva (Streak) definitiva no backend (contabilização de dias seguidos).
  - Criar gatilhos/marcos para emissão de certificados quando o usuário atingir 7, 15 e 30 dias de ofensiva.
  - Criar o endpoint de recuperação de ofensiva: `POST /gamification/recover-streak` (para quando o estudante quiser usar itens da loja para recuperar um dia perdido).

## 🚨 REGRAS ABSOLUTAS DE CÓDIGO (Diretrizes estritas)

O não cumprimento destas regras vai quebrar o design system e a estrutura da aplicação.

1. **Estilização**: NUNCA use CSS inline (`style={{...}}`) ou crie arquivos CSS manuais (como modules, etc). Use **estritamente** as classes utilitárias do Tailwind CSS e garanta consistência com as demais telas do projeto.
2. **Tipagem (TypeScript)**: NUNCA deixe `any` no código se houver alguma forma de inferir ou construir a tipagem, especialmente ao lidar com queries e retornos do Drizzle ORM.
3. **Preservação Visual**: Preserve rigorosamente os designs e layouts atuais. Suas modificações devem ter como alvo **apenas** as lógicas, requisições, endpoints e o fluxo de dados, sem interferir na aparência estabelecida pelo Design System.
