import { registerHooks } from "node:module"
import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import ts from "typescript"

// 直接运行项目源文件，不维护第二套测试用计算公式。
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && context.parentURL) {
      const url = new URL(specifier, context.parentURL)
      for (const ext of [".ts", ".tsx"]) {
        if (existsSync(fileURLToPath(url) + ext))
          return { url: url.href + ext, shortCircuit: true }
      }
    }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) {
      const source = readFileSync(new URL(url), "utf8").replaceAll(
        "import.meta.env.BASE_URL",
        "'/'",
      )
      const parsed = ts.createSourceFile(
        fileURLToPath(url),
        source,
        ts.ScriptTarget.Latest,
        true,
      )
      if (parsed.parseDiagnostics.length) {
        throw new Error(
          ts.formatDiagnosticsWithColorAndContext(parsed.parseDiagnostics, {
            getCurrentDirectory: () => process.cwd(),
            getCanonicalFileName: (name) => name,
            getNewLine: () => "\n",
          }),
        )
      }
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
        }).outputText,
      }
    }
    if (url.endsWith(".json"))
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${readFileSync(new URL(url), "utf8")}`,
      }
    return next(url, context)
  },
})
