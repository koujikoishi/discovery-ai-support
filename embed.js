import fs from 'fs';
import path from 'path';
import { ChromaClient } from 'chromadb';

const client = new ChromaClient();
const collection = await client.getOrCreateCollection({ name: 'discovery-faq' });

const docsPath = './docs'; // PDFやテキストファイルを入れるフォルダ
const files = fs.readdirSync(docsPath);

for (const file of files) {
  const filePath = path.join(docsPath, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  await collection.add({
    ids: [file],
    documents: [content],
    metadatas: [{ filename: file }],
  });

  console.log(`✅ 埋め込み完了：${file}`);
}

console.log('🎉 全データ投入完了');
