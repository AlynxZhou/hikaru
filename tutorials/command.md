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

| Options                | Description                   |
| :--------------------- | :---------------------------- |
| `-d`, `--debug`        | Enable debug output.          |
| `--no-color`           | Disable colored output.       |
| `-c`, `--config <yml>` | Alternative site config path. |
| `-h`, `--help`         | Print help infomation.        |

# `clean`

Clean all built files in doc dir.

## Usage

```
$ hikaru clean|c [options] [dir]
```

## Options

| Options                | Description                   |
| :--------------------- | :---------------------------- |
| `-d`, `--debug`        | Enable debug output.          |
| `--no-color`           | Disable colored output.       |
| `-c`, `--config <yml>` | Alternative site config path. |
| `-h`, `--help`         | Print help infomation.        |

# `build`

Read all src files, render them and output them into doc dir.

## Usage

```
$ hikaru build|b [options] [dir]
```

## Options

| Options                | Description                   |
| :--------------------- | :---------------------------- |
| `-d`, `--debug`        | Enable debug output.          |
| `--no-color`           | Disable colored output.       |
| `--draft`              | Build draft.                  |
| `-c`, `--config <yml>` | Alternative site config path. |
| `-h`, `--help`         | Print help infomation.        |

# `serve`

Read all src files, render them and start a live reload server. By default it listens in `http://localhost:2333/`.

## Usage

```
$ hikaru serve|s [options] [dir]
```

## Options

| Options                | Description                            |
| :--------------------- | :------------------------------------- |
| `-d`, `--debug`        | Enable debug output.                   |
| `--no-color`           | Disable colored output.                |
| `--no-draft`           | Skip draft.                            |
| `-c`, `--config <yml>` | Alternative site config path.          |
| `-i`, `--ip <ip>`      | Alternative listening IP address.      |
| `-p`, `--port <port>`  | Alternative listening port.            |
| `-h`, `--help`         | Print help infomation.                 |
