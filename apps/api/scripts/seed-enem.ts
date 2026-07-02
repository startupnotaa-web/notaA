import { readFileSync } from 'fs';

import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { createDbClient, questoesEnem } from '@notaa/db';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) console.warn("⚠️ DATABASE_URL não configurada. A ingestão falhará.");
const db = createDbClient(DATABASE_URL);

// Usar variáveis de ambiente para o Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas. O upload de imagens falhará se necessário.");
}

const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_KEY || 'anon');

interface ContentBlock {
  type: string;
  content: string;
}

interface QuestionData {
  number: number;
  content: ContentBlock[];
  alternatives: Record<string, {
    alternative: string;
    content: ContentBlock[];
    correct: boolean;
  }>;
}

async function uploadImageToSupabase(imageUrl: string, questionNumber: number, year: number): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extrai o nome do arquivo da URL (ex: question-1.png)
    const filename = imageUrl.split('/').pop() || `img-${Date.now()}.png`;
    const storagePath = `enem-${year}/${questionNumber}-${filename}`;

    const { data, error } = await supabase
      .storage
      .from('enem_images')
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error(`Erro no upload Supabase (Q${questionNumber}):`, error.message);
      // Se falhar (ex: bucket não existe ou chaves incorretas), retorna a URL original
      return imageUrl;
    }

    const { data: publicUrlData } = supabase.storage.from('enem_images').getPublicUrl(storagePath);
    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error(`Erro ao processar imagem para Q${questionNumber}:`, err.message);
    return imageUrl; // Fallback: usa a url do GitHub original se der erro no upload
  }
}

function processTextBlocks(content: ContentBlock[]): string {
  if (!content) return "";
  return content
    .filter(b => b.type === 'text')
    .map(b => b.content.trim())
    .join('\n');
}

function getAreaForQuestion(number: number, day: string): 'linguagens' | 'humanas' | 'natureza' | 'matematica' {
  if (day === '1') {
    return number <= 45 ? 'linguagens' : 'humanas';
  } else {
    return number <= 135 ? 'natureza' : 'matematica'; // Dia 2, assumindo Natureza e depois Matemática
  }
}

async function processFile(filePath: string, year: number, day: string) {
  console.log(`\nProcessando ${year} Dia ${day}... (${filePath})`);
  const rawData = readFileSync(filePath, 'utf-8');
  const json = JSON.parse(rawData);
  
  if (!json.data || !Array.isArray(json.data)) {
    console.warn(`Formato inesperado em ${filePath}`);
    return;
  }

  const questions: QuestionData[] = json.data;
  
  const insertPayloads = [];

  for (const q of questions) {
    const area = getAreaForQuestion(q.number, day);
    
    // Verifica se há imagem no enunciado principal
    const imageBlock = q.content.find(b => b.type === 'image');
    let imagemUrl = null;
    
    if (imageBlock && imageBlock.content) {
      console.log(`Baixando imagem para Q${q.number} - Ano ${year}...`);
      imagemUrl = await uploadImageToSupabase(imageBlock.content, q.number, year);
    }
    
    const enunciadoText = processTextBlocks(q.content);
    
    // Converte alternativas
    const alternativasArr: string[] = [];
    let corretaIdx = 0;
    
    for (let i = 0; i < 5; i++) {
      const altData = q.alternatives[String(i)];
      if (altData) {
        alternativasArr.push(processTextBlocks(altData.content));
        if (altData.correct) corretaIdx = i;
      }
    }

    insertPayloads.push({
      area,
      ano: year,
      enunciado: enunciadoText,
      alternativas: alternativasArr,
      correta: corretaIdx,
      dificuldadeTri: 'media', // Default como média, pode ser enriquecido depois
      imagemUrl: imagemUrl
    });
  }
  
  // Inserção em lotes
  if (insertPayloads.length > 0) {
    console.log(`Inserindo ${insertPayloads.length} questões no Drizzle...`);
    // Lote de 50
    for(let i = 0; i < insertPayloads.length; i += 50) {
      const batch = insertPayloads.slice(i, i + 50);
      try {
        await db.insert(questoesEnem).values(batch as any);
      } catch (err: any) {
        console.error(`Erro inserindo lote:`, err.message);
      }
    }
    console.log(`✅ Sucesso para ${year} Dia ${day}!`);
  }
}

async function main() {
  console.log('Iniciando script de ETL ENEM...');
  
  const files: string[] = [];
  const years = [2023, 2024];
  for (const year of years) {
    for (const day of ['1', '2']) {
      const pathStr = `tmp/enem-extractor/provas/${year}/${day}/output.json`;
      try {
        if (require('fs').existsSync(pathStr)) {
          files.push(pathStr);
        }
      } catch(e) {}
    }
  }
  
  for (const file of files) {
    // caminho: tmp/enem-extractor/provas/2023/1/output.json
    const parts = file.replace(/\\/g, '/').split('/');
    const yearStr = parts[parts.length - 3];
    const dayStr = parts[parts.length - 2];
    const year = parseInt(yearStr, 10);
    
    await processFile(file, year, dayStr);
  }

  console.log('\nPipeline de Ingestão Finalizada com sucesso! 🎉');
  process.exit(0);
}

main().catch(console.error);
