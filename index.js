const shield = require('./shield')

const blacklist = new Set(['inspect', 'constructor'])
// const mutators = new Map()

const veraverto = (params, options = {}) => {
  if (typeof options === 'string') options = { name: options }
  if (options.name == null) options.name = 'veraverto'

  const spell = Object(Symbol(options.name))

  const map = new Map()
  Object.keys(params).map(key => map.set(key, params[key]))

  const bind = (object, mutate = false, result = null) => {
    return new Proxy((getResult) => {
      if (!getResult) return object
      if (getResult === true) return result
      if (Array.isArray(getResult)) return [object, result]
    }, {
      get: (target, prop) => {
        if (!(prop in params)) {
          if (prop === 'name') return options.name
          if (blacklist.has(prop)) return undefined
          if (typeof prop === 'symbol') return undefined
          throw new TypeError(`Transform '${prop}' not found`)
        }

        return (...args) => {
          const { shielded, unshield } = mutate ? shield.fake(object) : shield(object)

          const result = params[prop].call(shielded, ...args)
          return bind(unshield(), mutate, mutate ? result : shield.unshield(result))
        }
      }
    })
  }

  if (options.func) {
    const func = (object) => bind(object)
    func.mut = (object) => bind(object, true)
    return func
  }

  Object.defineProperties(Object.prototype, { // eslint-disable-line no-extend-native
    [spell]: {
      get: function () {
        return bind(this)
      },
      enumerable: false,
      configurable: false
    }
  })

  spell.mut = (object) => bind(object, true)

  return spell
}

module.exports = veraverto
// module.exports.mutator = (spell, object) => {
//   if (!mutators.has(spell)) throw new Error('Spell not found')
//   return mutators.get(spell)(object)
// }
