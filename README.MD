📘 Assist CLI
A command-line assistant powered by OpenAI that helps you work with text-based tasks including summarizing, translating, explaining code, and even generating 4-panel comic strips — complete with scene illustrations.

✅ Features
✨ General CLI Features
Summarize: Automatically summarizes the content of a text file.

Explain: Explains code step-by-step in plain English.

Translate: Translates the content of a file into the specified language.

Comic Mode: Turns a simple story into a 4-panel comic script with scene descriptions and generates matching AI-generated illustrations.

🎨 Comic Mode Highlights
Accepts a short story in plain text.

Uses OpenAI to generate a 4-panel comic script including:

Scene description

Dialogues (speech/thought bubbles)

Automatically extracts each panel’s scene.

Uses OpenAI DALL·E API to generate images for each scene.

Assembles all panels into a single horizontal comic strip.

Stores each run inside its own folder:

```output/run-YYYY-MM-DDTHH-MM-SS/
├── comic_script.txt
├── panel1.png
├── panel2.png
├── panel3.png
├── panel4.png
└── final_comic_strip.png
```


🛠 Usage

# Summarize a file
node assist.js summarize notes.txt

# Translate a file to French
node assist.js translate notes.txt --lang=fr

# Explain code
node assist.js explain script.js

# Turn a short story into a 4-panel comic
node assist.js comic story.txt

📦 Requirements
Node.js

ImageMagick for combining images

```sudo apt install imagemagick
.env file with your OpenAI API key:
```

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

📁 Output
All output is stored in a timestamped folder under output/. You can browse each run independently without overwriting results.