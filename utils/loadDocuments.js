// utils/loadDocuments.js

import dotenv from 'dotenv';
dotenv.config();

import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddings } from '@langchain/openai';
import {
  loadCsvData,
  loadDocxFiles,
  loadTxtFiles,
  // loadPdfFiles, ← 将来必要ならアンコメント
} from './getEmbeddingDocuments.js';

const COLLECTION_NAME = 'faq-bot';

async function loadAllDocuments() {
  const csvRecords = await loadCsvData();
  const docxRecords = await loadDocxFiles();
  const txtRecords = await loadTxtFiles();
  // const pdfRecords = await loadPdfFiles(); // ← 将来対応するなら使う

  const allRecords = [...csvRecords, ...docxRecords, ...txtRecords];

  if (allRecords.length === 0) {
    console.error('❌ 読み込める文書が見つかりませんでした。');
    return;
  }

  const client = new ChromaClient();
  const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

  const embeddings = new OpenAIEmbeddings();
  const vectors = await embeddings.embedDocuments(allRecords);

  await collection.add({
    ids: allRecords.map((_, i) => `faq-${i}`),
    documents: allRecords,
    embeddings: vectors,
  });

  console.log(`✅ 合計 ${allRecords.length} 件の文書をアップロードしました`);
}

loadAllDocuments().catch((err) => {
  console.error('❌ アップロードエラー:', err);
});
