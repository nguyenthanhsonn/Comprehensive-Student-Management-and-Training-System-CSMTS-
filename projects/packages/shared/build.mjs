import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import ts from 'typescript';

const sourceDirectory = new URL('./src/', import.meta.url);
const outputDirectory = new URL('./dist/', import.meta.url);

async function listTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listTypeScriptFiles(path) : path;
    }),
  );

  return files.flat().filter((file) => extname(file) === '.ts');
}

await rm(outputDirectory, { recursive: true, force: true });

for (const sourceFile of await listTypeScriptFiles(sourceDirectory.pathname)) {
  const outputFile = join(
    outputDirectory.pathname,
    relative(sourceDirectory.pathname, sourceFile).replace(/\.ts$/, '.js'),
  );
  const source = await readFile(sourceFile, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourceFile,
  });

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, result.outputText);
}
