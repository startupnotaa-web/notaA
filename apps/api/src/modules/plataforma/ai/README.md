# Módulo `ai` (transversal)

Portão único de toda chamada de IA generativa (Socrática e Corretor de Redação), conforme `docs/03-arquitetura.md` §4 e `docs/06-integracao-ia.md`.

- `provedores/` contém o adaptador Gemini e o registro de uso de IA.
- `seguranca/` contém as verificações de resposta, a triagem de risco e o fluxo de notificação.
- `rate-limiter/` contém o interceptor de limites de uso.

⚠️ Nenhum outro módulo deve importar SDK de provedor de IA diretamente — só este módulo.
