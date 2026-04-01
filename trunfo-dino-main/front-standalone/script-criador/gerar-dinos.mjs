import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const INPUT_JSON = "./dados.json";
const OUTPUT_DIR = "./imgs-geradas";
// const MODEL = "gemini-3.1-flash-image-preview";
const MODEL = "gemini-2.5-flash";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Defina GEMINI_API_KEY no ambiente.");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"`´]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadDinos() {
  const raw = fs.readFileSync(INPUT_JSON, "utf8");
  return JSON.parse(raw);
}

function saveDinos(dinos) {
  fs.writeFileSync(INPUT_JSON, JSON.stringify(dinos, null, 2), "utf8");
}

function buildPrompt(nome) {
  return `Create a scientific book illustration of a ${nome}.
Style: classic natural history book illustration, similar to museum field guides or paleontology textbooks.
Full body visible, side profile, facing right.
Scientifically accurate paleo reconstruction with correct proportions.
Background: very subtle prehistoric environment, softly blurred, slightly desaturated, low detail, not distracting.
Centered composition with empty margin around the dinosaur for trading card layout.
Natural and believable coloration, clean and slightly simplified textures.
Soft even lighting, no dramatic shadows.
No text, no labels, no watermark.
Image optimized for web use and lightweight file size.`;
}

function outputFileName(dino) {
  return `${slugify(dino.nome)}.webp`;
}

function outputFilePath(dino) {
  return path.join(OUTPUT_DIR, outputFileName(dino));
}

function outputImageValue(dino) {
  return `imgs-geradas/${outputFileName(dino)}`;
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

async function generateImageBuffer(prompt) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const parts = response?.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  const textFallback = parts
    .filter((part) => part.text)
    .map((part) => part.text)
    .join("\n");

  throw new Error(
    `A resposta não trouxe imagem.${textFallback ? ` Texto retornado: ${textFallback}` : ""}`
  );
}

async function saveWebp(buffer, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  await sharp(buffer)
    .resize({
      width: 512,
      height: 512,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 72 })
    .toFile(filePath);
}

async function main() {
  const dinos = loadDinos();

  dinos.sort((a, b) => (b.fama ?? 0) - (a.fama ?? 0));

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const dino of dinos) {
    const filePath = outputFilePath(dino);

    if (fileExists(filePath)) {
      if (dino.imagem !== outputImageValue(dino)) {
        dino.imagem = outputImageValue(dino);
        saveDinos(dinos);
      }

      console.log(`Pulando ${dino.nome} -> já existe ${filePath}`);
      skipped++;
      continue;
    }

    try {
      console.log(`Gerando ${dino.nome}...`);

      const prompt = buildPrompt(dino.nome);
      const buffer = await generateImageBuffer(prompt);

      await saveWebp(buffer, filePath);

      dino.imagem = outputImageValue(dino);
      saveDinos(dinos);

      console.log(`OK -> ${filePath}`);
      generated++;

      await sleep(2500);
    } catch (error) {
      console.error(`Erro em ${dino.nome}: ${error.message}`);
      errors++;

      await sleep(8000);
    }
  }

  console.log("\nResumo:");
  console.log(`Geradas: ${generated}`);
  console.log(`Puladas: ${skipped}`);
  console.log(`Erros: ${errors}`);
}

main().catch((error) => {
  console.error("Falha geral:", error);
  process.exit(1);
});