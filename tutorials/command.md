Command Options
===============

Hikaru contains several sub commands.

# `init`

Init a site dir.

## Usage

```
$ hikaru init|i [options] [dir]
```

## Options

| Options                      | Description                   |
| :--------------------------- | :---------------------------- |
| `-d`, `--debug`              | Enable debug output.          |
| `--no-color`                 | Disable colored output.       |
| `-s`, `--site-config <yaml>` | Alternative site config path. |
| `-h`, `--help`               | Print help infomation.        |

# `clean`

Clean all built files in doc dir.

## Usage

```
$ hikaru clean|c [options] [dir]
```

## Options

| Options                      | Description                   |
| :--------------------------- | :---------------------------- |
| `-d`, `--debug`              | Enable debug output.          |
| `--no-color`                 | Disable colored output.       |
| `-s`, `--site-config <yaml>` | Alternative site config path. |
| `-h`, `--help`               | Print help infomation.        |

# `build`

Read all src files, render them and output them into doc dir.

## Usage

```
$ hikaru build|b [options] [dir]
```

## Options

| Options                       | Description                    |
| :---------------------------- | :----------------------------- |
| `-d`, `--debug`               | Enable debug output.           |
| `--no-color`                  | Disable colored output.        |
| `--draft`                     | Build draft.                   |
| `-s`, `--site-config <yaml>`  | Alternative site config path.  |
| `-s`, `--theme-config <yaml>` | Alternative theme config path. |
| `-h`, `--help`                | Print help infomation.         |

# `serve`

Read all src files, render them and start a live reload server. By default it listens in `http://localhost:2333/`.

While this command watch all site and theme files, `site-config.yaml` and `theme-config.yaml` are not able to watch, you should restart server after modifying them.

## Usage

```
$ hikaru serve|s [options] [dir]
```

## Options

| Options                       | Description                            |
| :---------------------------- | :------------------------------------- |
| `-d`, `--debug`               | Enable debug output.                   |
| `--no-color`                  | Disable colored output.                |
| `--no-draft`                  | Skip draft.                            |
| `-s`, `--site-config <yaml>`  | Alternative site config path.          |
| `-s`, `--theme-config <yaml>` | Alternative theme config path.         |
| `-i`, `--ip <ip>`             | Alternative listening IP address.      |
| `-p`, `--port <port>`         | Alternative listening port.            |
| `-h`, `--help`                | Print help infomation.                 |
