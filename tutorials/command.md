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
| `-d`, `--debug`        | Print debug messages.         |
| `-c`, `--config <yml>` | Alternative site config path. |
| `-h`, `--help`         | output usage information      |

# `clean`

Clean all built files in doc dir.

## Usage

```
$ hikaru clean|c [options] [dir]
```

## Options

| Options                | Description                   |
| :--------------------- | :---------------------------- |
| `-d`, `--debug`        | Print debug messages.         |
| `-c`, `--config <yml>` | Alternative site config path. |
| `-h`, `--help`         | output usage information      |

# `build`

Read all src files, render them and output them into doc dir.

## Usage

```
$ hikaru build|b [options] [dir]
```

## Options

| Options                | Description                   |
| :--------------------- | :---------------------------- |
| `-d`, `--debug`        | Print debug messages.         |
| `-c`, `--config <yml>` | Alternative site config path. |
| `-h`, `--help`         | output usage information      |

# `serve`

Read all src files, render them and start a live reload server. By default it listens in `http://localhost:2333/`.

## Usage

```
$ hikaru serve|s [options] [dir]
```

## Options

| Options                | Description                            |
| :--------------------- | :------------------------------------- |
| `-d`, `--debug`        | Print debug messages.                  |
| `-c`, `--config <yml>` | Alternative site config path.          |
| `-i`, `--ip <ip>`      | Alternative listening IP address.      |
| `-p`, `--port <port>`  | Alternative listening port.            |
| `-h`, `--help`         | output usage information               |
