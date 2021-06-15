import fs from 'fs';
import ts from 'typescript';

const VERBOSE = !!process.env.VERBOSE;

const TYPESCRIPT_BLOCK = /```(typescript|ts).*\n(?<code>(.|\n)*?)```/;

/**
 * HEADER to be added to code examples that do not contain an import statement, as many depend on these variables being defined
 */
const HEADER = `
import { interpret, createMachine, assign, StateMachine, State, SCXML } from 'xstate';
`;

const USER_MODEL = `
import { createModel } from 'xstate/lib/model';

const userModel = createModel(
  // Initial context
  {
    name: 'David',
    age: 30
  },
  {
    // Event creators
    events: {
      updateName: (name: string) => ({ name }),
      updateAge: (age: number) => ({ age }),
      anotherEvent: () => ({}) // no payload
    }
  }
);
`;

/**
 * List of expressions that when found in a code example cause the verifier to bail out
 */
const BAIL_EXPRESSIONS = [
  '@xstate/inspect' // xstate-inspect import breaks TS for reasons I do not understand
];
let errorCount = 0;

main();

function main() {
  let files = getFiles();
  VERBOSE && console.log(`Verifying Files:\n${files.join('\n')}`);

  for (let file of files) {
    processFile(file);
  }
  if (errorCount) {
    console.error(`Found ${errorCount} issues`);
    process.exit(1);
  } else {
    console.log('Done.');
  }
}
type VirtualFiles = Record<
  string,
  {
    code: string;
    lineNumber: number;
    headersOffset?: number;
  }
>;

function processFile(file: string): void {
  let contents = getFileContents(file);
  if (contents instanceof Error) {
    console.error(contents);
    return;
  }
  let matches = contents.match(new RegExp(TYPESCRIPT_BLOCK, 'g'));
  if (!matches) {
    VERBOSE &&
      console.warn(`File "${file}" contains no typescript blocks to verify`);
    return;
  }
  VERBOSE && console.log(`Verifying ${file}...`);

  let virtualFiles: VirtualFiles = {};
  for (let block of matches) {
    let code = block.match(TYPESCRIPT_BLOCK).groups.code;

    if (BAIL_EXPRESSIONS.some((expr) => code.indexOf(expr) != -1)) {
      continue;
    }

    let lineNumber = contents.substring(0, contents.indexOf(block)).split('\n')
      .length;

    let virtualFilename = `${file}:${lineNumber}.ts`;
    virtualFiles[virtualFilename] = { code, lineNumber };
  }

  verifyVirtualFiles(virtualFiles);
}

function verifyVirtualFiles(virtualFiles: VirtualFiles): void {
  let defaultCompilerHost = ts.createCompilerHost({});

  function fileExists(fileName: string): boolean {
    return ts.sys.fileExists(fileName);
  }

  function readFile(fileName: string): string | undefined {
    return ts.sys.readFile(fileName);
  }

  let program = ts.createProgram(
    Object.keys(virtualFiles),
    {
      allowSyntheticDefaultImports: true,
      composite: true,
      declaration: true,
      declarationMap: true,
      noUnusedParameters: true,
      strictNullChecks: true,
      downlevelIteration: true,
      experimentalDecorators: true,
      skipLibCheck: true,
      strictPropertyInitialization: true,
      lib: ['lib.esnext.d.ts', 'lib.dom.d.ts']
    },
    {
      ...defaultCompilerHost,
      /**
       * Where the magic happens - if we get a request for a file that in our list of virtual files,
       * we will return its code. Otherwise, we'll fallback to the defaultCompilerHost.getSourceFile()
       */
      getSourceFile(name, languageVersion) {
        let file = virtualFiles[name];
        if (file) {
          let code = file.code;
          // if the code DOES NOT contain an import statement
          if (code.indexOf('import ') === -1) {
            if (
              name.indexOf('models.md') > 0 &&
              code.indexOf('createModel') < 0
            ) {
              // SPECIAL CASE for "models.md"
              // models.md has a lot of examples that depend on a previously defined `userModel` variable.
              // We prepend a definition of that variable to examples that do not contain a `createModel()` invokation.
              code = HEADER + USER_MODEL + code;
              file.headersOffset = (HEADER + USER_MODEL).split('\n').length - 1;
            } else {
              // prepend our HEADER with the usual imports
              file.headersOffset = HEADER.split('\n').length - 1;
              code = HEADER + code;
            }
          }

          return ts.createSourceFile(name, code, ts.ScriptTarget.Latest);
        }

        return defaultCompilerHost.getSourceFile(name, languageVersion);
      },
      writeFile: () => {},
      useCaseSensitiveFileNames: () => false,
      getCanonicalFileName: (filename) => filename,
      getCurrentDirectory: () => '',
      getNewLine: () => '\n',
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => '',
      resolveModuleNames(moduleNames, containingFile, _, __, options) {
        let resolvedModules: Array<ts.ResolvedModule> = [];
        for (let moduleName of moduleNames) {
          let result = ts.resolveModuleName(
            moduleName,
            containingFile,
            options,
            { fileExists, readFile }
          );
          if (result.resolvedModule) {
            resolvedModules.push(result.resolvedModule);
          } else {
            console.warn(`Cannot resolve ${moduleName}`);
          }
        }
        return resolvedModules;
      }
    }
  );

  let emitResult = program.emit();
  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  for (let diagnostic of allDiagnostics) {
    errorCount++;
    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!
      );
      let virtualFile = virtualFiles[diagnostic.file.fileName];
      line = line + virtualFile.lineNumber - (virtualFile.headersOffset || 0);
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      );
      console.log(
        (VERBOSE ? '    ' : '') +
          `${diagnostic.file.fileName} (${line + 1},${
            character + 1
          }): ${message}`
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      );
    }
  }
}

function getFiles(): Array<string> {
  let files = process.argv.slice(2);

  if (files.length < 1) {
    console.error('No files given to verify');
    process.exit(1);
  }
  return files;
}

function getFileContents(file: string): string | Error {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    return e;
  }
}
