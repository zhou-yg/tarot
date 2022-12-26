import { css } from '@emotion/css'
import { VirtualLayoutJSON } from './types'
import { checkSematic, traverseLayoutTree } from './utils'

export const HOVER = 'hover'
export const ACTIVE = 'active'
export const FOCUS = 'focus'
export const DISABLED = 'disabled'
export const SELECTED = 'selected'

function isPseudo (k: any): k is string {
  return [HOVER, ACTIVE, FOCUS].includes(k)
}

function isAttr (k: any): k is string {
  return [DISABLED, SELECTED].includes(k)
}

function mapBooleanToNumber (b: boolean) {
  return b === true ? 1 : 0
}

type MatrixConstraint<T> = 
  T extends [infer F, ...infer R]
    ? [1 | 0 | '*', ...MatrixConstraint<R>]
    : []

type PatternVisionSematic = 'container' | 'text' | 'filltext' | 'decoration'

export type PatternMatrix2 = [
  string[],
  Record<string, {
    [cssProp: string]: {
      [cssValue: string]: ((1 | 0 | '*') | (1 | 0 | '*')[])[]
    }
  }>
]

export type TypePatternMatrix2Map = {
  [propName: string]: {
    value: string | string[]
    pattern: PatternMatrix2
  }[]
}

interface PatternCSSObj {
  attr: (string | number)[][],
  pseudo?: string
  style: {
    [cssProp: string]: string
  },
  sematic: string // 'container' | 'text' | 'filltext' | 'decoration'
}

/**
 * according to same attr and sematic
 */
export function mergeStyleObjs (cssObjs: PatternCSSObj[]) {
  const map = new Map<string, PatternCSSObj>()
  cssObjs.forEach(cssObj => {
    const { attr, pseudo, sematic } = cssObj
    const key = `${attr.map(arr => arr.join('')).join('')}${pseudo || ''}${sematic}`
    const old = map.get(key)
    if (old) {
      old.style = {
        ...old.style,
        ...cssObj.style,
      }
    } else {
      map.set(key, cssObj)
    }
  })
  return [...map.values()]
}

export function constructCSSObj (matrix: PatternMatrix2) {
  const [constraints, rules] = matrix

  const cssObjs: PatternCSSObj[] = []

  Object.entries(rules).forEach(([sematic, cssMatrix]) => {
    Object.entries(cssMatrix).forEach(([cssProp, cssMatrix]) => {
      Object.entries(cssMatrix).forEach(([cssValue, matches]) => {
        const cssObj: PatternCSSObj = {
          attr: [],
          style: {},
          sematic,
        }
        const attrMatches: (string|number)[][] = []
        
        matches.forEach((match, i) => {
          if (Array.isArray(match)) {
            const arr = match.map((v, i2) => {
              if (v !== '*') {
                return [constraints[i2], v]
              }
            }).filter(Boolean);

            attrMatches.push(...arr)
          } else {
            if (match !== '*') {
              attrMatches.push([constraints[i], match])
            }
          } 
        })

        const pseudos = attrMatches.filter(([attrOrPseudo, val]) => {
          return isPseudo(attrOrPseudo) && val !== 0
        }).map(arr => arr[0]) as string[]

        const attrMatchesWithoutPseudo = attrMatches.filter(([attrOrPseudo, val]) => {
          return !isPseudo(attrOrPseudo)
        })

        if (pseudos.length > 1) {
          console.error(`[createPatternCSS] only one pseudo is allowed, but received ${pseudos}`)
        }
        cssObj.pseudo = pseudos[0]
        cssObj.attr = attrMatchesWithoutPseudo
        cssObj.style[cssProp] = cssValue

        cssObjs.push(cssObj)
      })
    })
  })

  return cssObjs
}

const AttributeSelectorPrefix = 'data-'

function generateCSSIntoSematic (cssObjs: PatternCSSObj[]) {
  const sematicMap: Record<string, string[]> = {}
  cssObjs.forEach(cssObj => {
    const { attr, pseudo, style, sematic } = cssObj
    const attributeSelector = attr.reduce((acc, [attr, val]) => {
      acc[0] += String(attr)
      acc[1] += String(val)
      return acc
    }, [AttributeSelectorPrefix, '']).join('=')

    const styleText = Object.entries(style).map(([k, v]) => {
      return `${k}: ${v};`
    }).join('')

    const pseudoSelector = pseudo ? `:${pseudo}` : ''

    const cls = css`
    & [${attributeSelector}]${pseudoSelector} {
      ${styleText}
    }`
    
    const old = sematicMap[sematic]
    if (old) {
      old.push(cls)
    } else {
      sematicMap[sematic] = [cls]
    }
  })
  return sematicMap
}

/**
 * 暂不加 hash，如果有相同的css，确实就会生成完全相同的css
 */
export function createPatternCSS (matrix: PatternMatrix2) {

  const cssObjs: PatternCSSObj[] = constructCSSObj(matrix)

  const mergedObjs = mergeStyleObjs(cssObjs)

  const sematicCls = generateCSSIntoSematic(mergedObjs)

  return sematicCls
}

export function assignDeclarationPatterns (
  json: VirtualLayoutJSON,
  patternMatrix: PatternMatrix2
) {
  // const source = deepClone(json)
  const source = json

  const attributeConstraints = patternMatrix[0].filter(isAttr)

  const pattern = createPatternCSS(patternMatrix)

  traverseLayoutTree(source, node => {
    const { props } = node
    for (const sematic in pattern) {
      if (checkSematic(sematic, props)) {
        const cls = pattern[sematic].join(' ')
        if (props.className) {
          props.className = `${props.className} ${cls}`
        } else {
          props.className = cls
        }

        const attributeSelector: [string, string[], number[]] = [AttributeSelectorPrefix, [], []]
        attributeConstraints.forEach(attr => {
          if (attr in props) {
            attributeSelector[1].push(attr)
            attributeSelector[2].push(mapBooleanToNumber(props[attr]))
          }
        })
        if (attributeSelector[1].length > 0) {
          const newProp = [
            attributeSelector[0],
            attributeSelector[1].join(''),
          ].join('')

          props[newProp] = attributeSelector[2].join('')
        }
      }
    }
  })
  return source
}
