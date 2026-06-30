# Módulo `ai` (transversal)

Portão único de toda chamada de IA generativa (Socrática e Corretor de Redação), conforme `docs/03-arquitetura.md` §4 e `docs/06-integracao-ia.md`.

Subpastas previstas (passo 6 em diante): `context-builder/`, `rate-limiter/`, `prompt-registry/`, `risk-detector/`, `providers/` (adaptadores da `LLMProviderPort`).

⚠️ Nenhum outro módulo deve importar SDK de provedor de IA diretamente — só este módulo.
