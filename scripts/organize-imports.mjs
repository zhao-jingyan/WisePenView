import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const cwd = process.cwd();
const inputFiles = process.argv.slice(2);
const targetFiles = Array.from(
  new Set(
    inputFiles
      .map((file) => path.resolve(cwd, file))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => fs.existsSync(file))
  )
);

if (targetFiles.length === 0) {
  process.exit(0);
}

const host = {
  fileExists: fs.existsSync,
  readFile: (fileName) => fs.readFileSync(fileName, 'utf8'),
  writeFile: (fileName, content) => fs.writeFileSync(fileName, content, 'utf8'),
  getCurrentDirectory: () => cwd,
  getCompilationSettings: () => ({
    allowJs: true,
    target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
  }),
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  getScriptFileNames: () => targetFiles,
  getScriptVersion: () => '1',
  getScriptSnapshot: (fileName) => {
    if (!fs.existsSync(fileName)) {
      return undefined;
    }
    return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8'));
  },
  useCaseSensitiveFileNames: () => true,
  getNewLine: () => '\n',
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
};

const service = ts.createLanguageService(host, ts.createDocumentRegistry());
for (const fileName of targetFiles) {
  const changes = service.organizeImports({ type: 'file', fileName }, {}, {});
  for (const change of changes) {
    const original = fs.readFileSync(change.fileName, 'utf8');
    const updated = ts.textChanges.applyChanges(original, change.textChanges);
    fs.writeFileSync(change.fileName, updated, 'utf8');
  }
}
