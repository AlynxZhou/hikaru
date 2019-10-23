'use strict'

/**
 * @module highlight
 */

const hljs = require('highlight.js')
const {escapeHTML} = require('./utils')

let aliases = null

/**
 * @private
 * @return {Object} Key is alias, value is hljs lang name.
 */
const loadLangAliases = () => {
  const aliases = {}
  const languages = hljs.listLanguages()
  for (const lang of languages) {
    aliases[lang] = lang
    const lAliases = require(
      `highlight.js/lib/languages/${lang}`
    )(hljs)['aliases']
    if (lAliases != null) {
      for (const alias of lAliases) {
        aliases[alias] = lang
      }
    }
  }
  return aliases
}

/**
 * @typedef {Object} Data
 * @property {Number} [relevance]
 * @property {String} [language] Detected language.
 * @property {String} value Highlighted HTML string.
 */
/**
 * @private
 * @description Try to automatic highlight with detection.
 * @param {String} str
 * @return {Data}
 */
const highlightAuto = (str) => {
  for (const lang of Object.values(aliases)) {
    if (hljs.getLanguage(lang) == null) {
      hljs.registerLanguage(
        lang, require(`highlight.js/lib/languages/${lang}`)
      )
    }
  }
  const data = hljs.highlightAuto(str)
  if (data['relevance'] > 0 && data['language'] != null) {
    return data
  }
  return {'value': escapeHTML(str)}
}

/**
 * @description Highlight a str.
 * @param {String} str
 * @param {Object} [opts] Optional hljs parameters.
 * @param {Boolean} [opts.hljs] Add `hljs-` prefix to class name.
 * @param {Boolean} [opts.gutter] Generate line numbers.
 * @return {String} Highlighted HTML.
 */
const highlight = (str, opts = {}) => {
  if (aliases == null) {
    aliases = loadLangAliases()
  }
  if (opts['hljs']) {
    hljs.configure({'classPrefix': 'hljs-'})
  }

  let data
  if (opts['lang'] == null) {
    // Guess when no lang was given.
    data = highlightAuto(str)
  } else if (opts['lang'] === 'plain') {
    // Skip auto guess when user sets lang to plain,
    // plain is not in the alias list, so judge it first.
    data = {'value': escapeHTML(str)}
  } else if (aliases[opts['lang']] == null) {
    // Guess when lang is given but not in highlightjs' alias list, too.
    data = highlightAuto(str)
  } else {
    // We have correct lang alias, tell highlightjs to handle it.
    // If given language does not match string content,
    // highlightjs will set language to undefined.
    data = hljs.highlight(aliases[opts['lang']], str)
  }

  // Language in <figure>'s class is highlight's detected result,
  // not user input. To get user input, marked set it to parent <code>'s class.
  let results = ['<figure class="highlight hljs']
  if (data['language'] != null) {
    results.push(` ${data['language'].toLowerCase()}">`)
  } else {
    results.push('">')
  }

  if (opts['gutter']) {
    const gutters = ['<pre class="gutter">']
    const lines = data['value'].split(/\r?\n/g).length
    for (let i = 0; i < lines; ++i) {
      gutters.push(`<span class="line">${i + 1}</span>`)
      if (i !== lines - 1) {
        gutters.push('<br>')
      }
    }
    gutters.push('</pre>')
    results = results.concat(gutters)
  }
  results.push('<pre class="code"><code>')
  results.push(data['value'])
  results.push('</code></pre></figure>')
  return results.join('')
}

module.exports = highlight
