'use strict'

/**
 * @module index
 */

const commander = require('commander')
const pkg = require('../package.json')
const Hikaru = require('./hikaru')

commander
.version(pkg['version'], '-v, --version', 'Print version number.')
.usage('<subcommand> [options] [dir]')
.description(pkg['description'])
.helpOption('-h, --help', 'Print help infomation.')

commander.command('init [dir]').alias('i')
.description('Init a Hikaru site dir.')
.option('-d, --debug', 'Enable debug output.')
.option('-n, --no-color', 'Disable colored output.')
.option('-c, --config <yml>', 'Alternative site config path.')
.helpOption('-h, --help', 'Print help infomation.')
.action((dir, opts) => {
  new Hikaru(opts).init(dir || '.')
})

commander.command('clean [dir]').alias('c')
.description('Clean built docs.')
.option('-d, --debug', 'Enable debug output.')
.option('-n, --no-color', 'Disable colored output.')
.option('-c, --config <yml>', 'Alternative site config path.')
.helpOption('-h, --help', 'Print help infomation.')
.action((dir, opts) => {
  new Hikaru(opts).clean(dir || '.')
})

commander.command('build [dir]').alias('b')
.description('Build site.')
.option('-d, --debug', 'Enable debug output.')
.option('-n, --no-color', 'Disable colored output.')
.option('-c, --config <yml>', 'Alternative site config path.')
.helpOption('-h, --help', 'Print help infomation.')
.action((dir, opts) => {
  new Hikaru(opts).build(dir || '.')
})

commander.command('serve [dir]').alias('s')
.description('Serve site.')
.option('-d, --debug', 'Enable debug output.')
.option('-n, --no-color', 'Disable colored output.')
.option('-c, --config <yml>', 'Alternative site config path.')
.option('-i, --ip <ip>', 'Alternative listening IP address.')
.option('-p, --port <port>', 'Alternative listening port.', Number.parseInt)
.helpOption('-h, --help', 'Print help infomation.')
.action((dir, opts) => {
  new Hikaru(opts).serve(dir || '.')
})

// Handle unknown commands.
commander.on('command:*', () => {
  console.error(`Invalid command: ${commander.args.join(' ')}`)
  console.error('Run `hikaru --help` for a list of available commands.')
  process.exit(1);
})

/**
 * @method
 * @param {String[]} [argv]
 */
module.exports = (argv = process.argv) => {
  commander.parse(argv)
}
