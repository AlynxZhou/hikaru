/**
 * @module index
 */

import {Command} from "commander";

import Hikaru from "./hikaru.js";
import {pkgJSON, getVersion} from "./utils.js";

const command = new Command();

command
  .version(getVersion(), "-v, --version", "Print version number.")
  .usage("<subcommand> [options] [dir]")
  .description(pkgJSON["description"])
  // Overwrite default help option description.
  .helpOption("-h, --help", "Print help infomation.")
  // Overwrite default help command description.
  .addHelpCommand("help [subcommand]", "Print help information.");

command.command("init").alias("i")
  .argument("[dir]", "Site dir.")
  .description("Init a Hikaru site dir.")
  .option("-d, --debug", "Enable debug output.")
  .option("--no-color", "Disable colored output.")
  .option("-c, --config <yaml>", "Alternative site config path. (deprecated)")
  .option("-s, --site-config <yaml>", "Alternative site config path.")
  // Overwrite default help option description.
  .helpOption("-h, --help", "Print help infomation.")
  .action((dir, opts) => {
    new Hikaru(opts).init(dir || ".");
  });

command.command("clean").alias("c")
  .argument("[dir]", "Site dir.")
  .description("Clean built docs.")
  .option("-d, --debug", "Enable debug output.")
  .option("--no-color", "Disable colored output.")
  .option("-c, --config <yaml>", "Alternative site config path. (deprecated)")
  .option("-s, --site-config <yaml>", "Alternative site config path.")
  // Overwrite default help option description.
  .helpOption("-h, --help", "Print help infomation.")
  .action((dir, opts) => {
    new Hikaru(opts).clean(dir || ".");
  });

command.command("build").alias("b")
  .argument("[dir]", "Site dir.")
  .description("Build site.")
  .option("-d, --debug", "Enable debug output.")
  .option("--no-color", "Disable colored output.")
  .option("--draft", "Build drafts.")
  .option("-c, --config <yaml>", "Alternative site config path. (deprecated)")
  .option("-s, --site-config <yaml>", "Alternative site config path.")
  .option("-t, --theme-config <yaml>", "Alternative theme config path.")
  // Overwrite default help option description.
  .helpOption("-h, --help", "Print help infomation.")
  .action((dir, opts) => {
    new Hikaru(opts).build(dir || ".");
  });

command.command("serve").alias("s")
  .argument("[dir]", "Site dir.")
  .description("Serve site.")
  .option("-d, --debug", "Enable debug output.")
  .option("--no-color", "Disable colored output.")
  .option("--no-draft", "Skip drafts.")
  .option("-c, --config <yaml>", "Alternative site config path. (deprecated)")
  .option("-s, --site-config <yaml>", "Alternative site config path.")
  .option("-t, --theme-config <yaml>", "Alternative theme config path.")
  .option("-i, --ip <ip>", "Alternative listening IP address.")
  .option("-p, --port <port>", "Alternative listening port.", Number.parseInt)
  // Overwrite default help option description.
  .helpOption("-h, --help", "Print help infomation.")
  .action((dir, opts) => {
    new Hikaru(opts).serve(dir || ".");
  });

// Handle unknown commands.
command.on("command:*", () => {
  console.error(`Invalid command: ${command.args.join(" ")}`);
  console.error("Run `hikaru --help` for a list of available commands.");
  process.exit(1);
});

/**
 * @method
 * @param {String[]} [argv]
 */
const hikaru = (argv = process.argv) => {
  command.parse(argv);
};

export default hikaru;
