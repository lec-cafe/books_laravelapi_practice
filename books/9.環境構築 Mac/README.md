---
---

# Mac を用いた環境構築

## PHP 実行環境の構築

Laravel を動作させる場合、比較的最新の PHP 実行環境が必要になります。

Mac を利用するケースで、最新の PHP 環境を利用したい場合は、
以下のサイトから MacOS 向けの PHP 環境をインストールするのが便利です。

https://php-osx.liip.ch/

Mac では、デフォルトで PHP 環境が用意されており、以下のコマンドでPHPのバージョンが確認可能です。

```bash
$ php -v
```

このバージョンに問題がある場合は、 `https://php-osx.liip.ch/` のコマンドで、
任意の PHP 環境をインストールすることができます。

例えば、`7.2` のバージョンを選ぶには、以下のようなコマンドになります。

```bash
$ curl -s https://php-osx.liip.ch/install.sh | bash -s 7.2
```

::: tip
どのバージョンを選択するか迷った場合には、 `Current stable` のバージョンを選択すると良いでしょう。
:::

インストータした PHP は Mac 本体にもとより搭載されている PHP とは別に、
`/usr/local/php5/bin/php` に展開されます。

この PHP をデフォルトに設定するには `~/.profile` に、以下の一行を追加してみてましょう。

```text
export PATH=/usr/local/php5/bin:$PATH
```

この状態で新しいターミナルを開き `php -v` でバージョンを確認して、
希望するバージョンに変更されていれば作業は完了です。

## Composer 環境の構築

Composer は PHP の依存解決ツールです。 Composer を利用することで、
Laravel を始めとする様々なPHP ライブラリを簡単にインストールすることが可能になります。

Composer のインストールには以下のコマンドを利用します。

```bash
$ curl -sS https://getcomposer.org/installer | php
``` 

実行すると手元に `composer.phar` が作成されるため、パスの通った場所に移動させます。

```bash
$ sudo mv composer.phar /usr/local/bin/composer
```

最後にコマンドを実行して、バージョンが表示されればOKです。

```bash
$ composer --version
```

Composer 経由でインストールされたコマンドを実行可能にするため、`~/.profile` などに、
`~/.composer/vendor/bin` のパスを通しておきましょう。

```text
export PATH=$PATH:$HOME/.composer/vendor/bin
```

## Laravel 環境のセットアップ

Laravel 環境のセットアップを簡単に行うためには、
公式から提供されているインストーラーを利用するのが便利です。

インストーラは以下のコマンドでインストール可能です。

```bash
$ composer global require laravel/installer
```

コマンドが完了したら `laravel new` コマンドで、Laravel の初期構成がセットアップ可能になります。

```bash
$ laravel new blog
```

上記のようなコマンドを実行することで手元に blog フォルダが作成され、内部に Laravel の初期構成が展開されます。

### SQLite を利用する

ローカル Mac 環境で Laravel を利用する場合、SQLite データベースを利用するのが便利です。

`DB_CONNECTION=sqlite` の設定で SQLite データベースが利用可能となっており、
`.env` ファイルでの設定は以下のようになります。

```bash
DB_CONNECTION=sqlite
#DB_HOST=127.0.0.1
#DB_PORT=3306
#DB_DATABASE=homestead
#DB_USERNAME=homestead
#DB_PASSWORD=secret
```

SQLite データベースはを使用するために `database/database.sqlite` を作成しておきましょう。

```bash
$ touch database/database.sqlite
```

### Built-in Server の起動

最後にセットアップが完了したら、Laravel のフォルダ(composer.jsonのある階層)に移動して
`php artisan serve` のコマンドを実行します。

```bash
$ php artisan serve
```

ブラウザで `http://localhost:8000` にアクセスしてLaravel の初期画面が表示されたらセットアップは完了です。
