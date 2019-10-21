'use strict'

const commander = require('commander')
const pkg = require('../package.json')
const Hikaru = require('./hikaru')

commander
.version(pkg['version'])
.usage('<subcommand> [options] [dir]')
.description(pkg['description'])

commander.command('init [dir]').alias('i')
.description('Init a Hikaru site dir.')
.option('-d, --debug', 'Print debug messages.')
.option('-c, --config <yml>', 'Alternative site config path.')
.action((dir, cmd) => {
  new Hikaru(cmd['debug']).init(dir || '.', cmd['config'])
})

commander.command('clean [dir]').alias('c')
.description('Clean built docs.')
.option('-d, --debug', 'Print debug messages.')
.option('-c, --config <yml>', 'Alternative site config path.')
.action((dir, cmd) => {
  new Hikaru(cmd['debug']).clean(dir || '.')
})

commander.command('build [dir]').alias('b')
.description('Build site.')
.option('-d, --debug', 'Print debug messages.')
.option('-c, --config <yml>', 'Alternative site config path.')
.action((dir, cmd) => {
  new Hikaru(cmd['debug']).build(dir || '.', cmd['config'])
})

commander.command('serve [dir]').alias('s')
.description('Serve site.')
.option('-d, --debug', 'Print debug messages.')
.option('-c, --config <yml>', 'Alternative site config path.')
.option('-i, --ip <ip>', 'Alternative listening IP address.')
.option('-p, --port <port>', 'Alternative listening port.')
.action((dir, cmd) => {
  new Hikaru(cmd['debug']).serve(
    dir || '.', cmd['config'], cmd['ip'], cmd['port']
  )
})

module.exports = (argv) => {
  commander.parse(argv)
}
