import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = process.cwd();
const distExtension = join(root, "dist", "extension");
const outputDir = join(root, "dist", "packages");
const crxFile = join(outputDir, "bili-random-up-v1.0.0.crx");

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Read the manifest to get version
const manifestPath = join(distExtension, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const version = manifest.version;

console.log(`Packaging extension version ${version}...`);

// Check if 7-Zip is available
try {
  execSync("7z", { stdio: "pipe" });
  console.log("Using 7-Zip for packaging...");

  // Create ZIP file
  const zipFile = join(outputDir, `bili-random-up-v${version}.zip`);
  execSync(`7z a -tzip "${zipFile}" "${distExtension}\*"`, { stdio: "inherit" });

  console.log(`ZIP file created: ${zipFile}`);
  console.log(`
To create CRX file:`);
  console.log(`1. Go to chrome://extensions/`);
  console.log(`2. Enable "Developer mode"`);
  console.log(`3. Click "Pack extension"`);
  console.log(`4. Select the extension folder: ${distExtension}`);
  console.log(`5. The CRX file will be generated in the same directory`);

} catch (error) {
  console.log("7-Zip not found, trying PowerShell Compress-Archive...");

  try {
    const zipFile = join(outputDir, `bili-random-up-v${version}.zip`);
    execSync(
      `powershell -Command "Compress-Archive -Path '${distExtension}\*' -DestinationPath '${zipFile}' -Force"`,
      { stdio: "inherit" }
    );

    console.log(`ZIP file created: ${zipFile}`);
    console.log(`
To create CRX file:`);
    console.log(`1. Go to chrome://extensions/`);
    console.log(`2. Enable "Developer mode"`);
    console.log(`3. Click "Pack extension"`);
    console.log(`4. Select the extension folder: ${distExtension}`);
    console.log(`5. The CRX file will be generated in the same directory`);

  } catch (error) {
    console.error("Failed to create package. Please manually zip the extension folder:");
    console.log(distExtension);
    console.log(`
Then go to chrome://extensions/ and use "Pack extension" to create CRX file.`);
  }
}
