#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import yargs from 'yargs';
import { OpenAI } from 'openai';
import fetch from 'node-fetch';
import { execSync } from 'child_process';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const promptTemplates = {
  summarize: (text) => `Summarize this:\n\n${text}`,
  explain: (text) => `Explain the following code step by step:\n\n${text}`,
  translate: (text, lang) => `Translate this to ${lang}:\n\n${text}`,
  comic: (text) => `You are a comic strip writer. Turn the following story into a 4-panel comic. For each panel, provide a short scene description and the character dialogue.\n\nStory:\n${text}`,
};

const argv = yargs(process.argv.slice(2))
  .command('summarize <file>', 'Summarize a text file')
  .command('translate <file>', 'Translate a file', { lang: { type: 'string', demandOption: true } })
  .command('explain <file>', 'Explain a code file')
  .command('comic <file>', 'Turn text into a 4-panel comic strip', {
    overlay: {
      describe: 'Overlay dialogue on comic panels',
      type: 'boolean',
      default: false,
    },
  })
  .help().argv;

const cmd = argv._[0];
const file = argv.file || argv._[1];
const content = readFileSync(file, 'utf-8');

let prompt = '';

switch (cmd) {
  case 'summarize':
    prompt = promptTemplates.summarize(content);
    break;
  case 'explain':
    prompt = promptTemplates.explain(content);
    break;
  case 'translate':
    prompt = promptTemplates.translate(content, argv.lang);
    break;
  case 'comic':
    prompt = promptTemplates.comic(content);
    break;
  default:
    console.error('Unknown command');
    process.exit(1);
}

const res = await openai.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
  model: 'gpt-4o',
});

const output = res.choices[0].message.content;
console.log('\n=== OUTPUT ===\n');
console.log(output);

if (cmd === 'comic') {
  if (!existsSync('output')) mkdirSync('output');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runDir = `output/run-${timestamp}`;
  mkdirSync(runDir);

  writeFileSync(`${runDir}/comic_script.txt`, output);
  console.log(`\nComic script saved to ${runDir}/comic_script.txt`);

  const lines = output.split('\n');
  let panelCount = 0;
  const imagePaths = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^\*\*?Panel\s*\d+:\*\*?/i.test(line)) {
      let sceneLine = '';
      let dialogueLine = '';

      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        const match = next.match(/(?:\*+\s*)?(?:Scene(?: Description)?):\s*(.*?)\**$/i);
        if (match && match[1]) {
          sceneLine = match[1].trim();
        }
        const dialogMatch = next.match(/^\*\*(.*?)\*\*:\s*(.*)/) || next.match(/^(.*?)\s*[:：]\s*(.*)/);
        if (dialogMatch && dialogMatch[2]) {
          dialogueLine = dialogMatch[2].replace(/^"|"$/g, '').trim();
        }
        if (sceneLine && dialogueLine) break;
      }

      if (!sceneLine) {
        console.warn(`⚠️ No scene found under ${line}`);
        continue;
      }

      panelCount++;
      console.log(`\nGenerating image for Panel ${panelCount}...`);
      try {
        const imageRes = await openai.images.generate({
          prompt: `${sceneLine}, comic book style, clean lines, no text`,
          n: 1,
          size: '512x512',
        });

        const imageUrl = imageRes?.data?.[0]?.url;
        if (!imageUrl) {
          console.warn(`⚠️ Skipping panel ${panelCount}: No image URL returned.`);
          continue;
        }

        const imgFetch = await fetch(imageUrl);
        const buffer = Buffer.from(await imgFetch.arrayBuffer());
        const fileName = `${runDir}/panel${panelCount}.png`;
        writeFileSync(fileName, buffer);
        console.log(`Saved ${fileName}`);

        if (argv.overlay && dialogueLine) {
          const captionedFile = `${runDir}/panel${panelCount}_captioned.png`;
          const cmd = `convert "${fileName}" -gravity south -background black -splice 0x50 -fill white -pointsize 16 -annotate +0+5 "${dialogueLine}" "${captionedFile}"`;
          execSync(cmd);
          imagePaths.push(captionedFile);
        } else {
          imagePaths.push(fileName);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to generate image for panel ${panelCount}:`, e.message);
      }
    }
  }

  if (imagePaths.length > 0) {
    try {
      const outputPath = `${runDir}/final_comic_strip.png`;
      const cmd = `convert +append ${imagePaths.join(' ')} ${outputPath}`;
      execSync(cmd, { stdio: 'inherit' });
      console.log(`\n✅ Combined comic strip saved to ${outputPath}`);
    } catch (err) {
      console.error('\n⚠️ Failed to combine images with ImageMagick.');
      console.error('Reason:', err.message);
      console.error('💡 Tip: Try running this manually to debug:');
      console.error(`convert +append ${imagePaths.join(' ')} ${runDir}/final_comic_strip.png`);
    }
  } else {
    console.warn('\n⚠️ No comic panels were generated. Skipping strip assembly.');
  }
}
