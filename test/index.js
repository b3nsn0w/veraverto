/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

const { expect } = require('chai')

const veraverto = require('..')

describe('veraverto', function () {
  let spell

  it('creates transforms', function () {
    spell = veraverto({
      setX: function (x) { this.x = x },
      setY: function (y) { this.y = y },
      setZ: function (z) { this.z = z },
      removeZ: function () { delete this.z },
      string: function () { return `${this.x}:${this.y}` },
      setOriginX: function (x) { this.origin.x = x },
      mutant: function (x, y) {
        veraverto.mutator(spell, this).setX(x).setY(y)()
      }
    })

    expect(spell).to.be.a('symbol')
    expect({}[spell]).to.be.a('function')
  })

  it('can transform objects', function () {
    expect({}[spell].setX(5)().x).to.equal(5)
    expect({ x: 3 }[spell].setY(42)()).to.deep.equal({ x: 3, y: 42 })
    expect({ x: 4, y: 5, z: 6 }[spell].removeZ()()).to.deep.equal({ x: 4, y: 5 })
  })

  it('can chain transforms', function () {
    expect({}[spell].setX(19).setY(69)()).to.deep.equal({ x: 19, y: 69 })
  })

  it('can return values from transforms', function () {
    expect({}[spell].setX(5).setY(7).string()(true)).to.equal('5:7')

    const [object, result] = {}[spell].setX(19).setY(72).string()([])
    expect(object).to.deep.equal({ x: 19, y: 72 })
    expect(result).to.equal('19:72')
  })

  it('can handle null transforms', function () {
    expect({}[spell]()).to.deep.equal({})
    expect({}[spell](true)).to.equal(null)
  })

  it("doesn't mutate objects", function () {
    const base = { x: 4, y: 5, origin: { x: 3 } }

    const p1 = base[spell].setX(12).setY(43)()
    const p2 = base[spell].setX(5).setOriginX(42)()

    expect(base).to.deep.equal({ x: 4, y: 5, origin: { x: 3 } })
    expect(p1).to.deep.equal({ x: 12, y: 43, origin: { x: 3 } })
    expect(p2).to.deep.equal({ x: 5, y: 5, origin: { x: 42 } })

    // no deep cloning either, this is strict equal, it's the same object
    expect(base.origin).to.equal(p1.origin)
  })

  it('except if you use the mutator', function () {
    const base = { x: 4, y: 5, origin: { x: 3 } }

    const p1 = veraverto.mutator(spell, base).setX(12).setY(43)()

    expect(base).to.deep.equal({ x: 12, y: 43, origin: { x: 3 } })
    expect(p1).to.deep.equal({ x: 12, y: 43, origin: { x: 3 } })

    expect(base).to.equal(p1)
  })

  it('can use the mutator within an immutable transform', function () {
    const base = { x: 4, y: 5, origin: { x: 3 } }

    const p1 = base[spell].mutant(12, 43)()
    const p2 = base[spell].setX(5).setOriginX(42)()

    expect(base).to.deep.equal({ x: 4, y: 5, origin: { x: 3 } })
    expect(p1).to.deep.equal({ x: 12, y: 43, origin: { x: 3 } })
    expect(p2).to.deep.equal({ x: 5, y: 5, origin: { x: 42 } })
  })

  it('works as a function too', function () {
    const binder = veraverto({
      setX: function (x) { this.x = x }
    }, { func: true })

    const original = { x: 4, y: 5 }
    const modified = binder(original).setX(9)()

    expect(original).to.deep.equal({ x: 4, y: 5 })
    expect(modified).to.deep.equal({ x: 9, y: 5 })
  })

  it('is virtually undetectable', function () {
    // if you have to ask, you'll never know
    expect(Object.getOwnPropertyNames({})).to.be.empty
    expect(Object.getOwnPropertySymbols({})).to.be.empty
    expect(Object.hasOwnProperty(spell)).to.be.false
    expect({}.propertyIsEnumerable(spell)).to.be.false
    expect(Object.keys({})).to.be.empty
    expect(Object.getOwnPropertyDescriptor({}, spell)).to.be.undefined
    expect(Reflect.ownKeys({})).to.be.empty

    const keys = []
    for (const key in {}) keys.push(key)
    expect(keys).to.be.empty

    // if you know, you need only ask
    expect(spell in {}).to.be.true
  })
})
