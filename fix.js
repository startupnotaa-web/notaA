const fs = require('fs');
const path = require('path');

// 1. ai.controller.ts
let aiPath = 'apps/api/src/modules/ai/ai.controller.ts';
let aiContent = fs.readFileSync(aiPath, 'utf8');
aiContent = aiContent.replace('const res = await fetch(', 'const res: any = await fetch(');
fs.writeFileSync(aiPath, aiContent);

// 2. supabase-admin.adapter.ts
let supPath = 'apps/api/src/modules/auth/supabase-admin.adapter.ts';
let supContent = fs.readFileSync(supPath, 'utf8');
supContent = supContent.replace('await this.client.auth.admin.updateUserById', 'await (this.client.auth as any).admin.updateUserById');
fs.writeFileSync(supPath, supContent);

// 3. batalha-coletiva/page.tsx
let bcPath = 'apps/web/app/(estudante)/batalha-coletiva/page.tsx';
let bcContent = fs.readFileSync(bcPath, 'utf8');
bcContent = bcContent.replace(/nivel\.atual\.nivel/g, 'nivel.atual');
bcContent = bcContent.replace(/variant=\"outline\"/g, 'variant=\"neutral\"');
fs.writeFileSync(bcPath, bcContent);

// 4. comunidade/page.tsx
let comPath = 'apps/web/app/(estudante)/comunidade/page.tsx';
let comContent = fs.readFileSync(comPath, 'utf8');
comContent = comContent.replace(/data\.nivel\.atual\.nivel/g, 'data.nivel.atual');
comContent = comContent.replace(/variant=\"outline\"/g, 'variant=\"neutral\"');
// Fix possible undefined errors (L129, L130, L154)
comContent = comContent.replace(/post\.autor\.nomeCurto/g, 'post?.autor?.nomeCurto');
comContent = comContent.replace(/post\.autor\.id/g, 'post?.autor?.id');
comContent = comContent.replace(/post\.autor\.avatar/g, 'post?.autor?.avatar');
fs.writeFileSync(comPath, comContent);

// 5. dashboard/page.tsx
let dbPath = 'apps/web/app/(estudante)/dashboard/page.tsx';
let dbContent = fs.readFileSync(dbPath, 'utf8');
dbContent = dbContent.replace(/streak\.ultimaAtividade/g, '(streak as any).ultimaAtividade');
fs.writeFileSync(dbPath, dbContent);

// 6. escola/page.tsx
let escPath = 'apps/web/app/(estudante)/escola/page.tsx';
let escContent = fs.readFileSync(escPath, 'utf8');
escContent = escContent.replace(/variant=\"outline\"/g, 'variant=\"neutral\"');
fs.writeFileSync(escPath, escContent);

// 7. mapa-conhecimento/page.tsx
let mapPath = 'apps/web/app/(estudante)/mapa-conhecimento/page.tsx';
let mapContent = fs.readFileSync(mapPath, 'utf8');
mapContent = mapContent.replace(/variant=\"outline\"/g, 'variant=\"secondary\"');
fs.writeFileSync(mapPath, mapContent);

// 8. minha-narrativa/page.tsx
let mnPath = 'apps/web/app/(estudante)/minha-narrativa/page.tsx';
let mnContent = fs.readFileSync(mnPath, 'utf8');
mnContent = mnContent.replace(/nivel\.atual\.nivel/g, 'nivel.atual');
mnContent = mnContent.replace(/variant=\"outline\"/g, 'variant=\"neutral\"');
mnContent = mnContent.replace(/arquetipo\./g, 'arquetipo?.');
fs.writeFileSync(mnPath, mnContent);

// 9. perfil/page.tsx
let pPath = 'apps/web/app/(estudante)/perfil/page.tsx';
let pContent = fs.readFileSync(pPath, 'utf8');
pContent = pContent.replace(/variant=\"outline\"/g, 'variant=\"neutral\"');
fs.writeFileSync(pPath, pContent);

// 10. previsao-nota/page.tsx
let pnPath = 'apps/web/app/(estudante)/previsao-nota/page.tsx';
let pnContent = fs.readFileSync(pnPath, 'utf8');
pnContent = pnContent.replace(/variant=\"danger\"/g, 'variant=\"error\"');
fs.writeFileSync(pnPath, pnContent);

// 11. relatorio-familiar/page.tsx
let rfPath = 'apps/web/app/(estudante)/relatorio-familiar/page.tsx';
let rfContent = fs.readFileSync(rfPath, 'utf8');
rfContent = rfContent.replace(/nivel\.atual\.nivel/g, 'nivel.atual');
fs.writeFileSync(rfPath, rfContent);

console.log('Done replacing.');
