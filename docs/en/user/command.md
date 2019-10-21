Command Options
===============

# TOC

- For Users
    - [Install](../user/install.md)
    - [Init](../user/init.md)
    - [Config](../user/config.md)
    - [Write](../user/write.md)
    - [Command](../user/command.md)
    - [Deploy](../user/deploy.md)
    - [Plugins and Scripts](../user/plugins-and-scripts.md)
- For Developers
    - [Lifecycle](../dev/lifecycle.md)
    - [Hikaru](../dev/hikaru.md)
    - [Types](../dev/types.md)
    - [Utils](../dev/utils.md)
    - [Extend](../dev/extend.md)
    - [Theme](../dev/theme.md)

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

Prev Page: [Write](write.md)

Next Page: [Deploy](deploy.md)

