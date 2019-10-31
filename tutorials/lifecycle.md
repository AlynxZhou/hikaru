Lifecycle
=========

This page contains what hikaru do when you run a command.

# `init`

It's really simple because it is just a function that make directories and copy files ... and I don't think you need to extend this function.

# `clean`

This is also a simple function that remove files in docs directory, you don't need to modify this function.

# `build` and `serve`

So those are complex functions and Hikaru does them by different modules. You should remind that Hikaru is designed as a command line program instead of a library, so you cannot take parts of Hikaru and use only this part, they are not designed for this.

At first you see a class called `Hikaru`, but it just a collection of instances of modules and variables. When you enter a command, you will get an instance of Hikaru and run different methods, if you use `build` or `serve`, it first load config files and prepare variables, then create different instances of modules, and it register some internal methods to those modules to provide basic functions for creating a site. To allow you to modify it, Hikaru will then load plugins and script, it will pass itself to plugins and allow them register methods to different modules. Then it is prepared for making the site.

Your theme's language files will be loaded by `Translator` here, and theme's layout templates will be loaded by `Decorator` here too.

Making the site is done by a special module called `Router`, it is special because it call other modules to create a site. Hikaru call `Router::build` or `Router::serve` to start this process. First router will read files in srcs directory and theme srcs directory, and detect whether a file is binary or text (to make it easier only support UTF-8 encoding), and then classify them to `asset`, `template`, `post` or `page` by file type or layout property in front matter.

And then `Router` will call first module `Renderer`, it contains registered functions, and will render file content by different extend names of file's srcPath, after rendering it replaces file extend name, and save it in file's docPath.

Then `Router` call `Processor` to edit some page with cheerio or other libs.

After processing `Router` will call `Generator`. Though Hikaru builds routes with directory structures, some output files don't have source files like sitemap files. So we create `File` objects manually in generator functions before saving.

Finally if you called `Router::build`, `Router` will save them to doc directory with their `docPath`, posts and pages will be decorated with different templates, which is depend on their layout. And if you called `Router::serve`, `Router` will build an object with `docPath` and files, then start a http server, if you request a path, it will find it in the object and return a page, posts and pages will be decorated before return, too. Also it will watch file and reload them automatically.
