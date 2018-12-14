_Veraverto_ is a library that creates and handles transforms. A _transform_ is an operation on an object similar to a method of a class, but it always returns a new object rather than mutating it, and it is not attached to the object. Here is an example for a transform:

```javascript
//           the three phases: |    1    |   2   | 3
const modified = { x: 3, y: 4 }[transform].setX(5)()
```

A transform consists of three phases:

 - **init**: creates the transform with a property access that corresponds to the _spell_ ([see below](#init-phase))
 - **call**: one or more transforms are executed
 - **retrieve**: the transformed object, the return value of the last transform, or both are retrieved

## Init Phase

Transforms can be defined with the Veraverto library:

```javascript
const veraverto = require('veraverto')

const spell = veraverto({
  setX: function (x) {
    this.x = x
  },
  setY: function (y) {
    this.y = y
  },
  string: function () {
    return `${this.x}:${this.y}`
  }
})
```

The `veraverto()` function takes an object as its parameter, which is a collection of transforms. Each _transform_ is a function that operates on the `this` value, Veraverto allows this to be done with no mutations to the original object.

The return value of the `veraverto()` function is a symbol that retrieves the transform, this is called the _spell_. Example:

```javascript
const original = { x: 19, y: 60 }
const modified = original[spell].setY(81)()
```

If your module provides a transform for other modules to use, this spell is the value you need to export.

## Call Phase

After your transform has been retrieved, it's time to execute it. You can do this by simply calling the functions you passed to Veraverto earlier. It's important to note that transforms are chainable, your call phase can be as long as you would like. Example:

```javascript
const original = { x: 19, y: 26 }
const modified = original[spell].setX(20).setY(98).setX(19)()
```

## Retrieve Phase

You may have noticed already that there is an extra function call at the end of every transform. It's kind of logical, since if you skip it, you just fall back to chaining, but it's more than just a necessity. You can use it to retrieve either

 - the transformed object, using `()`
 - the return value of the last transform, using `(true)`
 - or both, using `([])`

All transforms above retrieved just the transformed object. Here's an example for the other two:

```javascript
const name = { x: 18, y: 85 }[spell].setY(99).string()(true)

const original = { x: 18, y: 81 }
const [modified, string] = original[spell].setX(19).setY(97).string()([])
```

# API Reference

Veraverto exports one function:

## `veraverto(params, options)`

It has two arguments, `params` and `options`, where:

 - `params` is an object containing your transforms. Each property is a function, which will receive the target object as `this`. You can just mutate that object, all changes will be isolated on the target and won't affect the original.
 - `options` contains the configuration. It has the following properties:
   - `name`: a human-readable name for your spell, it will show up on the symbol and potentially at debugging. If you just use a string instead of the `options` object, it will set this field.
   - `func`: switches Veraverto into [function mode](#function-mode)

The `veraverto()` function returns either a symbol, which will be the _spell_, or a function if the `func` option is set.

## The Spell

When the `veraverto()` function is ran, it attaches a hidden getter to `Object.prototype`, using the spell symbol. This way, with a simple property access, you can "summon" the _transform body_ anywhere:

```javascript
randomFunctionReturningStuff()[spell].setX(42)()
```

The transform body itself is a function which controls the retrieve phase. It has a single argument, `getResult`, which controls the value returned:

 - if `false`, `null`, or `undefined`, it returns the transformed object
 - if `true`, it returns the return value of the last function
 - if it's an array, it returns an array of `[object, result]`, where `object` is the transformed object, and `result` is the return value of the last function

This means you can do "null transforms" like `[spell]()` if you ever find a reason to do so. More importantly, this is the value returned by each transform, allowing chaining. You can retrieve your transforms from the transform body with a simple property access like `.setX`.

## Function Mode

If the `func` option is set, instead of a spell symbol the `veraverto()` function returns another function. This function is the _binder_, and it works very similarly to the spell:

```javascript
// instead of this
const withMagic = { x: 3, y: 5 }[spell].setX(4)()

// you do this
const noMagic = binder({ x: 3, y: 5 }).setX(4)()
```

This way you can avoid extending `Object.prototype`. The spell is designed to avoid any problem with it by using a non-enumerable getter on the prototype (in fact it doesn't show up in any function like `Object.getOwnPropertySymbols()` ran against any object), but in case you run into edge cases where it causes problems, function mode can be useful.

## The Mutator

By default, Veraverto transforms do not mutate the transformed object. However, in some cases this might be necessary, which is where the _mutator_ steps in. The mutator functions just like any other transform, but it mutates the target object. It has a different init phase, and it always uses function style:

```javascript
const original = { x: 3, y: 5 }
const mutated = spell.mut(original).setX(4) // you don't even need the retrieval phase

console.log(original) // { x: 4, y: 5 }
```

The only question is why would you do that? Doesn't it just nullify the advantages of Veraverto? Well, the answer is yes, kind of. The real point of the mutator is using it within an immutable transform. For example:

```javascript
const spell = veraverto({
  setX: function (x) {
    this.x = x
  },
  setY: function (y) {
    this.y = y
  },
  setBoth: function (x, y) {
    spell.mut(this).setX(x).setY(y)()
  }
})
```

This way, `setBoth()` is still an immutable mutation on the outside, but it can reuse other transforms.

The mutator works on the function style the exact same way, `binder.mut()` and `spell.mut()` are the same.

## Limitations

Currently, Veraverto doesn't support async transforms and doesn't simulate `Object.defineProperty()` on the target object during a transform. These features can be included in a simple upgrade seamlessly if you update your own Veraverto dependency.

Despite extending a native object, Veraverto will not conflict with itself if multiple versions of it are loaded simultaneously. This is due to the strategy of using symbols as property names, in short, `Symbol('veraverto') !== Symbol('veraverto')`.

# Motivation

Veraverto is another solution for the simple question of "where should I put my methods" problem. Classes are great, but they're inherently mutable, and they bundle code with data, which adds the overhead of constant serialization and deserialization (mostly to and from JSON in JS) when used in any moderately complex system. On the other hand, when not using classes you'll quickly end up with simple functions bundled around specific data structures or tasks, and the problem of immutability still complicates things.

The goals of Veraverto are:

 - operate on "just data", simple, JSON-compatible objects, no magic types
 - make immutability simple and easy to use
 - provide an easy way to bundle relevant code together

## But... how?

Magic. Lots of magic.

Specifically, Veraverto relies on two somewhat obscure features. One is a non-enumerable getter on `Object.prototype` which makes the spell work. The other one is the ES6 Proxy object, which enables Veraverto to track the changes on the `this` object passed to the transforms without either having to devise a special syntax like [immutable.js](https://facebook.github.io/immutable-js/) and [immutability-helper](https://github.com/kolodny/immutability-helper#readme) do or having to deep clone everything. This latter one takes up most of the library.

## Does it really have to be this ugly?

First of all, thanks for noticing. But the truth is, yes, it does. Let's break it down with the very first snippet:

```javascript
//           the three phases: |    1    |   2   | 3
const modified = { x: 3, y: 4 }[transform].setX(5)()
```

The first phase is pretty much fixed, using a symbol for the spell is the only safe way, and you can't use symbols for property access without brackets. This can be switced to the function style:

```javascript
const modified = transform({ x: 3, y: 4 }).setX(5)()
```

but in my opinion it makes it more ugly, not less, because it disrupts the logical left-to-right arrangement of the code. It's especially noticable with multiple transforms:

```javascript
//        original |    first transform    | second transform
const spell = point[foo].setX(12).setY(5)()[bar].normalize()()

//   second, first, original, more first, then more second
const func = bar(foo(point).setX(12).setY(5)()).normalize()()
```

Arguably, the second phase is the least ugly part. Ugly usually means unconventional in this interpretation, and the second phase is just a bunch of chained function calls, we see that all the time.

As for the third part, it's necessary to enable chaining and a custom retrieval strategy. Without it, the only feasible option would be

```javascript
const modified = point[foo].setX(12)[foo].setX(5)[bar].normalize()
```

which does look better, I'll give it that, but it gets really long very quickly, and you'd lose access to the return value of the transform. This might actually have a real-world use case though, especially for simpler transforms, and it could be implemented as an option like `func`.

# Contributing, license, and other stuff

As always, pull requests, bug reports, suggestions, and other kinds of improvements are welcome. Just be respectful towards each other, and maybe run or create tests as appropriate. It's on `npm test`, as usual.

Veraverto is available under the MIT license.