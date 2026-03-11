import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const distExtension = join(root, "dist", "extension");
const outputDir = join(root, "dist", "packages");

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Read the manifest to get version
const manifestPath = join(distExtension, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const version = manifest.version;

console.log(`Packaging extension version ${version}...`);

// Function to recursively get all files
function getFiles(dir, baseDir = dir) {
  const files = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getFiles(fullPath, baseDir));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// Get all files in extension directory
const files = getFiles(distExtension);

console.log(`Found ${files.length} files to package`);

// Create a simple HTML file that can be used to package the extension
const packageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Package Extension</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
    }
    h1 { color: #333; }
    .info {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .step {
      margin: 10px 0;
      padding-left: 20px;
    }
    .code {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 3px;
      font-family: monospace;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <h1>Package Bilibili Discovery Engine v${version}</h1>

  <div class="info">
    <h2>Extension Information</h2>
    <p><strong>Name:</strong> ${manifest.name}</p>
    <p><strong>Version:</strong> ${version}</p>
    <p><strong>Description:</strong> ${manifest.description}</p>
  </div>

  <div class="info">
    <h2>How to Create CRX File</h2>
    <div class="step">
      <strong>Step 1:</strong> Open Chrome/Edge and navigate to <span class="code">chrome://extensions/</span>
    </div>
    <div class="step">
      <strong>Step 2:</strong> Enable "Developer mode" in the top right corner
    </div>
    <div class="step">
      <strong>Step 3:</strong> Click the "Pack extension" button
    </div>
    <div class="step">
      <strong>Step 4:</strong> Select the extension folder: <span class="code">${distExtension}</span>
    </div>
    <div class="step">
      <strong>Step 5:</strong> The CRX file will be generated in the same directory as the extension folder
    </div>
  </div>

  <div class="info">
    <h2>Files Included (${files.length} total)</h2>
    <ul>
      ${files.map(f => `<li>${relative(distExtension, f)}</li>`).join('')}
    </ul>
  </div>
</body>
</html>`;

const htmlPath = join(outputDir, `package-v${version}.html`);
writeFileSync(htmlPath, packageHtml);

console.log(`
Package information created: ${htmlPath}`);
console.log(`
To create CRX file:`);
console.log(`1. Open ${htmlPath} in your browser`);
console.log(`2. Follow the instructions on the page`);
console.log(`3. The CRX file will be generated in: ${distExtension}`);
