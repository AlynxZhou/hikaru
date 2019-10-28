Hikaru
======

This page contains what can you find in Hikaru. When you are creating plugins, your plugin will get a Hikaru instance, you can use following in it.

# `Hikaru::logger`

A `Logger` instance which extends `console.Console`, you should use this when you want to output some words. Don't use `console.log`.

# `Hikaru::types`

This contains some data types used by Hikaru.

# `Hikaru::utils`

Many helper functions provided by Hikaru.

# `Hikaru::site`

A `Site` instance that stores all info of the site.

# `Hikaru::opts`

A Object that stores all `commander.js` options.

# `Hikaru::router`

A `Router` instance used by Hikaru, don't touch it.

# `Hikaru::translator`

A `Translator` instance which will be used by other module automatically.

# `Hikaru::renderer`

A `Renderer` instance, you can register your renderer function to it.

# `Hikaru::processor`

A `Processor` instance, you can register your processor function to it.

# `Hikaru::generator`

A `Generator` instance, you can register your generator function to it.
