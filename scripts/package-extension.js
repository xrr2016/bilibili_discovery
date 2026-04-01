import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, statSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = process.cwd();
const distExtension = join(root, "dist", "extension");
const outputDir = join(root, "dist", "packages");

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Read package.json to get version
const packageJsonPath = join(root, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

console.log(`Packaging extension version ${version}...`);

// Files and directories to exclude from the package
const EXCLUDE_PATTERNS = [
  "*.md",           // All markdown files
  ".gitkeep",       // Git placeholder files
  ".DS_Store",      // macOS system files
  "Thumbs.db"       // Windows thumbnail cache
];

// Function to recursively remove files matching patterns
function cleanDirectory(dir, patterns) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Check if directory name matches any pattern
      if (patterns.some(pattern => item === pattern || item.includes(pattern))) {
        console.log(`Removing directory: ${fullPath}`);
        rmSync(fullPath, { recursive: true, force: true });
      } else {
        // Recursively clean subdirectories
        cleanDirectory(fullPath, patterns);
      }
    } else if (stat.isFile()) {
      // Check if file name matches any pattern
      if (patterns.some(pattern => 
        item === pattern || 
        item.endsWith(pattern.replace("*", "")) ||
        pattern.startsWith("*") && item.endsWith(pattern.slice(1))
      )) {
        console.log(`Removing file: ${fullPath}`);
        rmSync(fullPath, { force: true });
      }
    }
  }
}

// Clean the extension directory before packaging
console.log("\nCleaning extension directory...");
cleanDirectory(distExtension, EXCLUDE_PATTERNS);
console.log("Cleanup complete.\n");

// Create ZIP file using archiver
const zipFile = join(outputDir, `bilibili-discovery-engine-v${version}.zip`);
console.log(`Creating ZIP package: ${zipFile}`);

// Function to check if a file should be excluded
function shouldExclude(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.startsWith("*")) {
      return fileName.endsWith(pattern.slice(1));
    }
    return fileName === pattern;
  });
}

// Function to recursively add files to archive
function addFilesToArchive(archive, dir, baseDir) {
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      addFilesToArchive(archive, fullPath, baseDir);
    } else if (stat.isFile() && !shouldExclude(fullPath)) {
      const relativePath = fullPath.replace(baseDir, "").replace(/^[\\/]/, "");
      archive.file(fullPath, { name: relativePath });
    }
  }
}

// Create output stream
const output = createWriteStream(zipFile);
const archive = archiver("zip", {
  zlib: { level: 9 } // Maximum compression
});

// Handle archive events
output.on("close", () => {
  console.log(`\n✓ ZIP file created: ${zipFile}`);
  console.log(`  Total size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
  console.log(`\nTo create CRX file:`);
  console.log(`1. Go to chrome://extensions/`);
  console.log(`2. Enable "Developer mode"`);
  console.log(`3. Click "Pack extension"`);
  console.log(`4. Select the extension folder: ${distExtension}`);
  console.log(`5. The CRX file will be generated in the same directory`);
});

archive.on("error", (err) => {
  console.error("\n✗ Archive error:", err.message);
  console.error("\nPlease manually zip the extension folder:");
  console.log(distExtension);
  console.log(`\nMake sure to exclude the following files/directories:`);
  EXCLUDE_PATTERNS.forEach(p => console.log(`  - ${p}`));
  console.log(`\nThen go to chrome://extensions/ and use "Pack extension" to create CRX file.`);
  process.exit(1);
});

// Pipe archive data to the file
archive.pipe(output);

// Add all files from extension directory
addFilesToArchive(archive, distExtension, distExtension);

// Finalize the archive
archive.finalize();
