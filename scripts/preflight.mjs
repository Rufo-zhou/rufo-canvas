import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  ".env.example",
  "app/layout.tsx",
  "app/page.tsx",
  "app/auth/page.tsx",
  "app/projects/page.tsx",
  "app/projects/[projectId]/page.tsx",
  "app/api/image-generation/route.ts",
  "app/api/media-generation/route.ts",
  "app/api/prompt-polish/route.ts",
  "components/auth/AuthProvider.tsx",
  "components/auth/AuthPanel.tsx",
  "components/projects/ProjectDashboard.tsx",
  "components/canvas/ProjectCanvas.tsx",
  "components/canvas/AgentSidebar.tsx",
  "components/canvas/ImageAssetNode.tsx",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/database.ts",
  "lib/image-generation/service.ts",
  "lib/media-generation/catalog.ts",
  "lib/media-generation/service.ts",
  "lib/media-generation/schema.ts",
  "lib/prompt/seedance-video.ts",
  "supabase/migrations/0001_initial_schema.sql"
];

const requiredEnv = [
  "NEXT_PUBLIC_APP_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NANO_BANANA_API_KEY",
  "GPTLMAGE2_API_KEY",
  "IMAGE_GENERATION_MOCK",
  "POLLINATIONS_API_KEY",
  "HUGGINGFACE_API_KEY",
  "AGNES_API_KEY"
];

const requiredSnippets = [
  ["components/auth/AuthProvider.tsx", "signInWithPassword"],
  ["components/auth/AuthProvider.tsx", "signUp"],
  ["components/auth/AuthProvider.tsx", "signInAnonymously"],
  ["components/auth/AuthProvider.tsx", "signOut"],
  ["components/projects/ProjectDashboard.tsx", "createProject"],
  ["components/projects/ProjectDashboard.tsx", "deleteProject"],
  ["components/canvas/ProjectCanvas.tsx", "ReactFlow"],
  ["components/canvas/ProjectCanvas.tsx", "restoreAssetNodeUrls"],
  ["components/canvas/ProjectCanvas.tsx", "saveCanvasSnapshot"],
  ["components/canvas/ImageAssetNode.tsx", "NodeResizer"],
  ["components/canvas/AgentSidebar.tsx", "referenceImagePath"],
  ["components/canvas/AgentSidebar.tsx", "seedanceOptimize"],
  ["components/canvas/AgentSidebar.tsx", "videoPromptBoosters"],
  ["app/api/image-generation/route.ts", "createGenerationTask"],
  ["app/api/image-generation/route.ts", "createGeneratedAsset"],
  ["app/api/image-generation/route.ts", "uploadGeneratedImageToStorage"],
  ["app/api/media-generation/route.ts", "startAsyncMediaGeneration"],
  ["app/api/media-generation/route.ts", "enforceDailyQuota"],
  ["app/api/prompt-polish/route.ts", "optimizeSeedanceVideoPrompt"],
  ["lib/media-generation/catalog.ts", "sana-free"],
  ["lib/media-generation/catalog.ts", "agnes-video-2.0"],
  ["lib/prompt/seedance-video.ts", "optimizeSeedanceVideoPrompt"],
  ["supabase/migrations/0001_initial_schema.sql", "storage.buckets"],
  ["supabase/migrations/0001_initial_schema.sql", "Users can upload generated asset files"]
];

const errors = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`Missing required file: ${file}`);
  }
}

const envExample = read(".env.example");
for (const variable of requiredEnv) {
  if (!envExample.includes(`${variable}=`)) {
    errors.push(`Missing env variable in .env.example: ${variable}`);
  }
}

for (const [file, snippet] of requiredSnippets) {
  if (!read(file).includes(snippet)) {
    errors.push(`Missing expected snippet "${snippet}" in ${file}`);
  }
}

checkLocalImports();

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("preflight ok");

function read(file) {
  const absolute = path.join(root, file);

  if (!fs.existsSync(absolute)) {
    return "";
  }

  return fs.readFileSync(absolute, "utf8");
}

function checkLocalImports() {
  const files = [];
  walk(root, files);
  const extensions = [".ts", ".tsx", ".js", ".jsx"];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const importPattern = /from ['"](@\/[^'"]+|\.[^'"]+)['"]|import\(['"](@\/[^'"]+|\.[^'"]+)['"]\)/g;
    let match;

    while ((match = importPattern.exec(source))) {
      const specifier = match[1] || match[2];
      const base = specifier.startsWith("@/")
        ? path.join(root, specifier.slice(2))
        : path.join(path.dirname(file), specifier);

      const exists = extensions.some((extension) => fs.existsSync(`${base}${extension}`))
        || fs.existsSync(path.join(base, "index.ts"))
        || fs.existsSync(path.join(base, "index.tsx"));

      if (!exists) {
        errors.push(`Missing local import target "${specifier}" in ${path.relative(root, file)}`);
      }
    }
  }
}

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue;
    }

    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(absolute, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(absolute);
    }
  }
}
