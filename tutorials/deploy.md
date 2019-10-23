Deploy Site
===========

As you see, Hikaru does not provide a built-in `deploy` command. However, due to the simple structure it use, it is easy to deploy by yourself, because you can use tools you like to upload doc dir.

# Git

## Commit docs only

If you want to deploy it with git, first you can create a git repo dir:

(Suppose that you are inside site dir.)

```
$ mkdir deploy_git
$ cd deploy_git
$ git init .
$ git remote add origin YOURGITURL
```

Then copy files in doc dir to git repo:

```
$ cp -R ../docs/* ./
```

Then commit and push like other git project:

```
$ git add .
$ git commit -m "Updated site."
$ git push -u origin master
```

You can write a shell script to do this every time.

Don't forget to go to your GitHub Repo settings and choose `master branch` to host pages.

# Commit whole site (Recommanded if available)

Some host, like [GitHub Pages](https://pages.github.com/), allows you to commit whole site and host files in `docs/` dir only, so you can just commit your whole site, and use git to control your sources, too.

## Init repo before clone theme

As we all know, you cannot set a git repo when you already has a sub dir that already a git repo. It is very likely you choose to manage your theme with git, so you'd better move it away before creating a git repo for your site.

(Suppose that you are inside site dir.)

```
$ git init .
$ git remote add origin YOURGITURL
```

## Exclude theme

You can exclude it simply by add it into your `.gitignore` then clone it or add theme as a submodule:

```
$ git submodule add https://github.com/AlynxZhou/hikaru-theme-aria.git themes/aria
```

## Commit your whole site

Just commit it after you run `hikaru build` every time:

```
$ git add .
$ git commit -m "Updated site."
$ git push -u origin master
```

You can write a shell script to do this every time like:

```
#!/bin/bash

hikaru clean --debug
hikaru build --debug
git add .
git commit -m "Updated site."
git push -u origin master
```

Don't forget to go to your GitHub Repo settings and choose `master branch /docs folder` to host pages.
