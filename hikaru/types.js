'use strict'

class Site {
  constructor(siteDir) {
    this.siteDir = siteDir
    this.siteConfig = {}
    this.themeConfig = {}
    this.templates = {}
    this.posts = []
    this.pages = []
    this.assets = []
    this.files = []
    this.categories = []
    this.categoriesLength = 0
    this.tags = []
    this.tagsLength = 0
  }
}

class File {
  constructor(docDir, srcDir, srcPath) {
    this.srcDir = srcDir
    this.srcPath = srcPath
    this.docDir = docDir
    this.docPath = null
    this.isBinary = false
    this.createdTime = null
    this.updatedTime = null
    this.zone = null
    this.title = null
    this.layout = null
    this.comment = null
    this.reward = null
    this.raw = null
    this.text = null
    this.content = null
    this.type = null
    this.frontMatter = {}
    this.categories = []
    this.tags = []
    this.excerpt = null
    this.more = null
    this.$ = null
    this.toc = []
    this.posts = []
    this.pageArray = []
    this.pageIndex = null
    this.next = null
    this.prev = null
    // Don't use utils here, or it will cause circular dependencies.
    if (typeof(docDir) === 'object' && docDir != null) {
      Object.assign(this, docDir)
    }
  }
}

class Category {
  constructor(name, posts = [], subs = []) {
    this.name = name
    this.posts = posts
    this.subs = subs
  }
}
class Tag {
  constructor(name, posts = []) {
    this.name = name
    this.posts = posts
  }
}

class TOC {
  constructor(name, archor, text, subs = []) {
    this.name = name
    this.archor = archor
    this.text = text
    this.subs = subs
  }
}

module.exports = {
  Site,
  File,
  Category,
  Tag,
  TOC
}
