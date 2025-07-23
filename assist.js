#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();
import { readFileSync, writeFileSync } from 'fs';
import yargs from 'yargs';
import { OpenAI } from 'openai';
import fetch from 'node-fetch';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ Missing OPENAI_API_KEY in .env');
  process.exit(1);
}
const openai = new OpenAI({ apiKey });


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
  .command('comic <file>', 'Turn text into a 4-panel comic strip')
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
  writeFileSync('comic_script.txt', output);
  console.log('\nComic script saved to comic_script.txt');
}

