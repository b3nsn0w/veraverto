const shield = require('./shield')

const blacklist = new Set(['inspect', 'constructor'])

const veraverto = (params, options = {}) => {
  if (typeof options === 'string') options = { name: options }
  if (options.name == null) options.name = 'veraverto'

  const spell = Symbol(options.name)

  const map = new Map()
  Object.keys(params).map(key => map.set(key, params[key]))

  const bind = (object, result = null) => {
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
          const { shielded, unshield } = shield(object)

          const result = params[prop].call(shielded, ...args)
          return bind(unshield(), shield.unshield(result)) // TODO the result may need unshielding too
        }
      }
    })
  }

  if (options.func) return bind

  Object.defineProperty(Object.prototype, spell, { // eslint-disable-line no-extend-native
    get: function () {
      return bind(this)
    },
    enumerable: false,
    configurable: false
  })

  return spell
}

module.exports = veraverto
