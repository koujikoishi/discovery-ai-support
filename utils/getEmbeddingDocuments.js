import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
// import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'; // ← 将来必要なら有効化

const DOCS_DIR = './docs';
const CSV_PATH = './docs/faq.csv';

// 拡張子ごとのファイル取得
function getFilesByExtension(dir, ext) {
  return fs.readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(ext))
    .map((file) => path.join(dir, file));
}

// --- CSV読み込み ---
export async function loadCsvData() {
  const records = [];
  const parser = fs.createReadStream(CSV_PATH).pipe(parse({
    columns: true,
    skip_empty_lines: true
  }));

  for await (const record of parser) {
    const q = record.question?.trim();
    const a = record.answer?.trim();
    if (q && a) records.push(`${q} ${a}`);
  }

  return records;
}

// --- .docx読み込み ---
export async function loadDocxFiles() {
  const files = getFilesByExtension(DOCS_DIR, '.docx');
  const results = [];

  for (const file of files) {
    const loader = new DocxLoader(file);
    const docs = await loader.load();
    docs.forEach((d) => results.push(d.pageContent.trim()));
  }

  return results;
}

// --- .txt読み込み ---
export async function loadTxtFiles() {
  const files = getFilesByExtension(DOCS_DIR, '.txt');
  const results = [];

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf-8');
    if (text.trim()) results.push(text.trim());
  }

  return results;
}

// --- （将来）.pdf読み込み ---
// export async function loadPdfFiles() {
//   const files = getFilesByExtension(DOCS_DIR, '.pdf');
//   const results = [];

//   for (const file of files) {
//     const loader = new PDFLoader(file);
//     const docs = await loader.load();
//     docs.forEach((d) => results.push(d.pageContent.trim()));
//   }

//   return results;
// }
