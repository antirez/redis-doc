const cmnds = require('../commands')

/** @type {(arg, command: string) => import('json-schema').JSONSchema7} */
const argToSchema = (arg, command) => {
  if (arg.multiple || arg.variadic) {
    return {
      type: 'array',
      items: argToSchema({...arg, multiple: false, variadic: false}, command)
    }
  }
  const stringTypes = new Set(['key', 'string', 'pattern', 'type'])
  if (stringTypes.has(arg.type)) {
    return {
      type: 'string',
    }
  }
  if (arg.type === 'integer') {
    return {
      type: 'integer',
    }
  }
  if (arg.type === 'double') {
    return {
      type: 'number',
    }
  }
  if (arg.type === 'enum') {
    return {
      type: 'string',
      enum: arg.enum,
    }
  }
  if (typeof arg.command === 'string') {
    if (arg.multiple) {
      throw Error(`don't know how to handle this`)
    }
    const types = Array.isArray(arg.type) ? arg.type : [arg.type]
    const names = Array.isArray(arg.name) ? arg.name : [arg.name]
    return {
      type: 'array',
      items: [
        {type: 'string', enum: [arg.command]},
        ...types.map((type, i) => ({
          title: names[i],
          ...argToSchema({type, name: names[i]}),
        }))
      ]
    }
  }
  if (Array.isArray(arg.type)) {
    return {
      type: 'array',
      items: arg.type.map((type, i) => ({
        title: arg.name[i],
        ...argToSchema({type, name: arg.name[i]}),
      })),
    }
  }
  return {}
}

/** @type {(arg, command: string) => import('json-schema').JSONSchema7} */
const argToReturn = (command) => {
  const docFile = `commands/${command.toLowerCase()}.md`
  const fs = require('fs')
  if (!fs.existsSync(docFile)) {
    return {}
  }
  const doc = fs.readFileSync(docFile).toString()
  if (!doc.includes('@return')) {
    return {}
  }
  const returnDoc = doc.split('@return')[1].split('@example')[0]
  const mapping = {
    "@integer-reply": "integer",
    "@simple-string-reply: `OK`": `string`,
    "@string-reply": "string",
    "@bulk-string-reply: `nil`": "null",
    "@bulk-string-reply": "string",
    "@simple-string-reply": "string",
    "@array-reply": "array",
    "@nil-reply": "null",
    "@null-reply": "null",
    "NULL": "null",
    "`nil`": "null",
  };
  /** @type {string[]} */
  const typeMatches = Object.keys(mapping).reduce(
    (obj, key) => ({
      returnDoc: obj.returnDoc.split(key).join(""),
      matches: obj.returnDoc.includes(key) ? obj.matches.concat([mapping[key]]) : obj.matches
    }),
    {returnDoc, matches: []}
  ).matches;
  if (typeMatches.length === 0) {
    return {}
  }
  if (typeMatches.length === 1) {
    return {type: typeMatches[0]}
  }
  return {
    anyOf: typeMatches.map(type => ({type}))
  }
}
const jsonified = Object.keys(cmnds).reduce(
  (dict, key, i, r) => (() => {
    const command = cmnds[key]
    return {
      ...dict,
      [key]: {
        ...command,
        arguments: (command.arguments || []).map(arg => ({
          name: Array.isArray(arg.name) ? arg.name.join('_') : arg.name,
          optional: command && arg.optional,
          schema: argToSchema(arg, command),
        })),
        return: argToReturn(key),
      },
    }
  })(),
  {}
)

console.log(JSON.stringify(jsonified, null, 2))
