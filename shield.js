const shieldedObjects = new WeakMap()

const shield = (original) => {
  if (typeof original !== 'object') {
    return {
      shielded: original,
      unshield: () => original
    }
  }

  const changes = new Map()

  const shielded = new Proxy(original, {
    get: (target, prop) => {
      if (changes.has(prop)) {
        const change = changes.get(prop)
        switch (change.op) {
          case 'get': return change.shielded
          case 'set': return change.value
          case 'delete': return null
        }
      }

      if (!(prop in original)) return undefined

      const { shielded, unshield } = shield(original[prop])
      changes.set(prop, {
        op: 'get',
        shielded,
        unshield
      })

      return shielded
    },
    set: (target, prop, value) => {
      changes.set(prop, {
        op: 'set',
        value
      })
    },
    deleteProperty: (target, prop) => {
      changes.set(prop, {
        op: 'delete'
      })
    },
    ownKeys: () => {
      const changed = new Set(Reflect.ownKeys(original))

      for (const [prop, change] of changes.entries()) {
        switch (change.op) {
          case 'set':
            changed.add(prop)
            break
          case 'delete':
            changed.delete(prop)
            break
        }
      }

      return [...changed.values()]
    },
    getOwnPropertyDescriptor: (target, prop) => {
      if (prop === 'constructor') return undefined

      const value = shielded[prop] // not writing that logic again
      if (value === undefined) return undefined

      return { // just set everything to true, that'll be the end result anyway
        value,
        writable: true,
        enumerable: true,
        configurable: true
      }
    },
    has: (target, prop) => {
      if (changes.has(prop)) {
        const change = changes.get(prop)
        switch (change.op) {
          case 'get': return true
          case 'set': return true
          case 'delete': return false
        }
      }

      return prop in original
    },
    defineProperty: (target, prop, attributes) => {
      // TODO handle defineProperty
    },
    preventExtensions: () => {}, // nope
    setPrototypeOf: () => {} // nope again
  })

  const unshield = () => {
    const changed = { ...original }

    for (const [prop, change] of changes.entries()) {
      switch (change.op) {
        case 'get':
          changed[prop] = change.unshield()
          break
        case 'set':
          changed[prop] = change.value
          break
        case 'delete':
          delete changed[prop]
          break
      }
    }

    return changed
  }

  shieldedObjects.set(shielded, unshield)

  return {
    shielded,
    unshield
  }
}

module.exports = shield
module.exports.unshield = (object) => {
  if (!shieldedObjects.has(object)) return object
  return shieldedObjects.get(object)()
}
