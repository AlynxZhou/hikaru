'use strict'

/**
 * @module Router
 */

const fse = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')
const http = require('http')
const moment = require('moment-timezone')
const chokidar = require('chokidar')
const {File} = require('./types')
const {
  inside,
  isArray,
  isString,
  isFunction,
  isObject,
  default404,
  matchFiles,
  getVersion,
  getPathFn,
  getURLFn,
  getContentType,
  putSite,
  delSite,
  getFileLayout,
  isCurrentPathFn,
  parseFrontMatter
} = require('./utils')

/**
 * @description Core module that handling file routing.
 */
class Router {
  /**
   * @param {Logger} logger
   * @param {Renderer} renderer
   * @param {Processor} processor
   * @param {Generator} generator
   * @param {Translator} translator
   * @param {Site} site
   * @return {Router}
   */
  constructor(logger, renderer, processor, generator, translator, site) {
    this.logger = logger
    this.renderer = renderer
    this.processor = processor
    this.generator = generator
    this.translator = translator
    this.site = site
    this._ = {}
    this.watchers = []
    this.watchedEvents = []
    this.sourcePages = []
    this.handling = false
    this.getURL = getURLFn(
      this.site['siteConfig']['baseURL'], this.site['siteConfig']['rootDir']
    )
    this.getPath = getPathFn(this.site['siteConfig']['rootDir'])
    moment.locale(this.site['siteConfig']['language'])
  }

  /**
   * @private
   * @description Read file content.
   * @param {String} filepath
   * @return {Promise<Buffer>}
   */
  read(filepath) {
    return fse.readFile(filepath)
  }

  /**
   * @private
   * @description Write or copy file to docDir.
   * @param {File} file
   * @param {(Buffer|String)} content
   */
  write(file, content) {
    if (content == null) {
      content = file['content']
    }
    if (!file['isBinary']) {
      return fse.outputFile(
        path.join(file['docDir'], file['docPath']), content
      )
    }
    return fse.copy(
      path.join(file['srcDir'], file['srcPath']),
      path.join(file['docDir'], file['docPath'])
    )
  }

  /**
   * @private
   * @description Load files into site data via parsing front-matter.
   * @param {File} file
   */
  async loadFile(file) {
    this.logger.debug(`Hikaru is reading \`${
      this.logger.cyan(path.join(file['srcDir'], file['srcPath']))
    }\`...`)
    let raw = await this.read(path.join(file['srcDir'], file['srcPath']))
    // Auto detect if a file is a binary file or a UTF-8 encoding text file.
    file['isBinary'] = true
    if (raw.equals(Buffer.from(raw.toString('utf8'), 'utf8'))) {
      raw = raw.toString('utf8')
      file['isBinary'] = false
    }
    file['raw'] = raw
    file['text'] = raw
    // Theme sources do not have front-matter.
    if (file['srcDir'] === this.site['siteConfig']['srcDir']) {
      file = parseFrontMatter(file)
    }
    const results = await Promise.all(this.renderer.render(file))
    for (const result of results) {
      if (isFunction(result['content'])) {
        result['type'] = 'template'
        this.site['templates'][path.basename(
          result['srcPath'], path.extname(result['srcPath'])
        )] = result['content']
      } else if (result['layout'] === 'post') {
        result['type'] = 'post'
        putSite(this.site, 'posts', result)
      } else if (result['layout'] != null) {
        result['type'] = 'page'
        putSite(this.site, 'pages', result)
      } else {
        result['type'] = 'asset'
        putSite(this.site, 'assets', result)
      }
    }
  }

  /**
   * @private
   * @description Save file via layout.
   * @param {File} file
   */
  async saveFile(file) {
    this.logger.debug(`Hikaru is writing \`${
      this.logger.cyan(path.join(file['docDir'], file['docPath']))
    }\`...`)
    const layout = getFileLayout(file, Object.keys(this.site['templates']))
    if (layout != null) {
      this.write(
        file, await this.site['templates'][layout](this.loadContext(file))
      )
    } else {
      this.write(file, file['content'])
    }
  }

  /**
   * @private
   * @description Load context for template rendering.
   * @param {File} file
   * @return {File} File with context that can be used by template.
   */
  loadContext(file) {
    const lang = file['language'] || this.site['siteConfig']['language']
    return Object.assign(new File(), file, {
      'site': this.site,
      'siteConfig': this.site['siteConfig'],
      'themeConfig': this.site['themeConfig'],
      'moment': moment,
      'getVersion': getVersion,
      'getURL': this.getURL,
      'getPath': this.getPath,
      'isCurrentPath': isCurrentPathFn(
        this.site['siteConfig']['rootDir'], file['docPath']
      ),
      'isArray': isArray,
      'isString': isString,
      'isFunction': isFunction,
      'isObject': isObject,
      '__': this.translator.getTranslateFn(lang)
    })
  }

  /**
   * @private
   * @description Match all src files.
   * @return {Promise<File[]>}
   */
  async matchAll() {
    return (await matchFiles(path.join('**', '*'), {
      'nodir': true,
      'dot': true,
      'cwd': this.site['siteConfig']['themeSrcDir']
    })).map((srcPath) => {
      return new File(
        this.site['siteConfig']['docDir'],
        this.site['siteConfig']['themeSrcDir'],
        srcPath
      )
    }).concat((await matchFiles(path.join('**', '*'), {
      'nodir': true,
      'dot': true,
      'cwd': this.site['siteConfig']['srcDir']
    })).map((srcPath) => {
      return new File(
        this.site['siteConfig']['docDir'],
        this.site['siteConfig']['srcDir'],
        srcPath
      )
    }))
  }

  /**
   * @private
   * @description Build routes for all built files to serve.
   * @param {File[]} allFiles All built files.
   */
  buildServerRoutes(allFiles) {
    this._ = {}
    for (const f of allFiles) {
      const key = this.getPath(f['docPath'])
      this.logger.debug(`Hikaru is serving \`${
        this.logger.cyan(key)
      }\`...`)
      this._[key] = f
    }
  }

  /**
   * @private
   * @description Watch all src files.
   */
  watchAll() {
    for (const srcDir of [
      this.site['siteConfig']['themeSrcDir'],
      this.site['siteConfig']['srcDir']
    ]) {
      const watcher = chokidar.watch(path.join('**', '*'), {
        'cwd': srcDir, 'ignoreInitial': true
      })
      this.watchers.push(watcher)
      for (const event of ['add', 'change', 'unlink']) {
        watcher.on(event, (srcPath) => {
          this.logger.debug(
            `Hikaru is watching event \`${
              this.logger.blue(event)
            }\` from \`${
              this.logger.cyan(path.join(srcDir, srcPath))
            }\`...`
          )
          const i = this.watchedEvents.findIndex((p) => {
            return p['srcDir'] === srcDir && p['srcPath'] === srcPath
          })
          if (i !== -1) {
            // Just update event.
            this.watchedEvents[i]['type'] = event
          } else {
            // Not found.
            this.watchedEvents.push({event, srcDir, srcPath})
          }
          setImmediate(this.handleEvents)
        })
      }
    }
  }

  /**
   * @private
   * @description Unwatch all src files.
   */
  unwatchAll() {
    let w
    while ((w = this.watchers.shift()) != null) {
      w.close()
    }
  }

  /**
   * @private
   * @description Handle watcher events.
   */
  async handleEvents() {
    // Keep handling atomic. Prevent repeatedly handling.
    if (this.watchedEvents.length === 0 || this.handling) {
      return
    }
    this.handling = true
    let e
    while ((e = this.watchedEvents.shift()) != null) {
      const file = new File(
        this.site['siteConfig']['docDir'], e['srcDir'], e['srcPath']
      )
      if (e['event'] === 'unlink') {
        for (const key of ['assets', 'pages', 'posts']) {
          delSite(this.site, key, file)
        }
      } else {
        file = await this.loadFile(file)
      }
    }
    await this.handle()
    this.buildServerRoutes(
      this.site['assets']
      .concat(this.site['posts'])
      .concat(this.site['pages'])
      .concat(this.site['files'])
    )
    this.handling = false
  }

  /**
   * @private
   * @description Start a listening server.
   * @param {String} ip
   * @param {Number} port
   */
  listen(ip, port) {
    const server = http.createServer(async (request, response) => {
      // Remove query string.
      const url = request['url'].split(/[?#]/)[0]
      let res
      if (this._[url] == null) {
        this.logger.log(`404: ${url}`)
        res = this._[this.getPath('404.html')] || new File({
          'content': default404,
          'docPath': this.getPath('404.html')
        })
        response.writeHead(404, {
          'Content-Type': getContentType(res['docPath'])
        })
      } else {
        this.logger.log(`200: ${url}`)
        res = this._[url]
        response.writeHead(200, {
          'Content-Type': getContentType(res['docPath'])
        })
      }
      const layout = getFileLayout(res, Object.keys(this.site['templates']))
      if (layout != null) {
        response.write(
          await this.site['templates'][layout](this.loadContext(res))
        )
      } else {
        response.write(res['content'])
      }
      response.end()
    })
    process.prependListener('exit', () => {
      server.close()
      this.logger.log(
        `Hikaru is stopping to listen on http://${ip}:${port}${
          this.getPath()
        }...`
      )
      this.unwatchAll()
    })
    this.logger.log(
      `Hikaru is starting to listen on http://${ip}:${port}${this.getPath()}...`
    )
    if (ip !== 'localhost') {
      server.listen(port, ip)
    } else {
      server.listen(port)
    }
    this.watchAll()
  }

  /**
   * @private
   * @description Handle all processor and generator.
   */
  async handle() {
    this.site = await this.processor.process(this.site)
    this.site['files'] = await this.generator.generate(this.site)
  }

  /**
   * @description Build all site docs.
   */
  async build() {
    await Promise.all((await this.matchAll()).map(this.loadFile.bind(this)))
    await this.handle()
    this.site['assets']
    .concat(this.site['posts'])
    .concat(this.site['pages'])
    .concat(this.site['files'])
    .map(this.saveFile.bind(this))
  }

  /**
   * @description Serve all site docs.
   */
  async serve(ip, port) {
    await Promise.all((await this.matchAll()).map(this.loadFile.bind(this)))
    await this.handle()
    this.buildServerRoutes(
      this.site['assets']
      .concat(this.site['posts'])
      .concat(this.site['pages'])
      .concat(this.site['files'])
    )
    this.listen(ip, port)
  }
}

module.exports = Router
