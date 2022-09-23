import { parseDeps } from "./analyzer";
import * as prettier from 'prettier'
import * as fs from 'fs'
import * as path from 'path'
import { IConfig } from "../config";
import { equalFileContent, loadJSON, tryMkdir } from "../util";
import { autoGeneratedFileTag, injectTagEnd, injectTagStart } from "./constants";

function template (
  origin: string,
  deps: string,
  assigns: string,
  filePath: string
) {
  return `${origin}
${injectTagStart}
${filePath}
${deps}
${assigns}
${injectTagEnd}
`
}

function cleanOriginalCodeTag (code: string) {
  const rows = code.split('\n')
  let si = -1
  let ei = -1
  rows.forEach((r, i) => {
    if (r.trim() === injectTagStart) {
      si = i
    } else if (r.trim() === injectTagEnd) {
      ei = i
    }
  })
  if (si >= 0 && ei >= 0) {
    return rows.slice(0, si).concat(rows.slice(ei + 1)).join('\n')
  }
  return code
}

let i = 0;

export function injectDeps (c: IConfig, targetFile: string) {
  const code = fs.readFileSync(targetFile).toString()
  const parsed = path.parse(targetFile)

  const depsJSONPath = path.join(c.pointFiles.outputDriversDir, `${parsed.name}.deps.json`)

  if (fs.existsSync(depsJSONPath)) {
    const depsJSON = loadJSON(depsJSONPath)

    const AUTO_PARSER = 'autoParser' + Date.now() + `_${i++}` 

    const arr = Object.keys(depsJSON).map(funcName => {
      return `Object.assign(${funcName}, {
  __deps__: ${AUTO_PARSER}.${funcName}.deps,
  __names__: ${AUTO_PARSER}.${funcName}.names,
  __name__: "${funcName}" })`
    })

    const codeIncludingDeps = template(
      cleanOriginalCodeTag(code),
      `const ${AUTO_PARSER} = ${JSON.stringify(depsJSON).replace(/"/g, "'")}`,
      arr.join('\n').replace(/"/g, "'"),
      `// location at:${targetFile}`
    )

    const codeIncludingDepsWithFormat = prettier.format(codeIncludingDeps, { 
      parser: 'typescript'
    })

    if (
      !equalFileContent(code, codeIncludingDepsWithFormat) &&
      !(new RegExp(autoGeneratedFileTag).test(code))
    ) {
      fs.writeFileSync(targetFile, codeIncludingDepsWithFormat)
    }
  } else {
    throw new Error(`[injectDeps] not found deps.json with path "${depsJSONPath}"`)
  }
}

/** @TODO 1.integrated to the vite.plugin 2.upgrade to typescript */
export function generateHookDeps (c: IConfig) {
  const {
    outputClientDriversDir,
    outputServerDriversDir,
    outputDriversDir,
  } = c.pointFiles
  const {
    esmDirectory,
    cjsDirectory
  } = c

  const driversDir = outputDriversDir
 
  const sourceCodeDir = path.join(c.cwd, c.driversDirectory)

  fs.readdirSync(driversDir).forEach(f => {
    const compiledFile = path.join(driversDir, f)
    const name = f.replace(/\.js$/, '')
    if (/\.js$/.test(f)) {
      const code = fs.readFileSync(compiledFile).toString()

      const deps = parseDeps(code)      

      const devDriversDir = path.join(c.pointFiles.outputDriversDir)
      if (!fs.existsSync(devDriversDir)) {
        tryMkdir(devDriversDir)
      }

      // json in tarat: generate deps.json
      fs.writeFileSync(path.join(c.pointFiles.outputDriversDir, `${name}.deps.json`), JSON.stringify(deps, null, 2))
    
      // modify original hook file
      injectDeps(c, compiledFile);

      [outputClientDriversDir, outputServerDriversDir].forEach(envDir => {
        [esmDirectory, cjsDirectory].forEach(formatDir => {

          const cjsOutputFile = path.join(envDir, formatDir, `${name}.js`)
          injectDeps(c, cjsOutputFile)
        })
      })
    }
  })
}