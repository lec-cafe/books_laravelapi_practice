---
---

# Homestead による環境構築 

Homestead は Laravel の提供する Vagrant 環境キットで、
Laravel を動作させるために必要なソフトウェアが一通りインストールされています。

Vagrant はローカル環境構築を行うためのツールで、
仮想環境を用いて PC 上に Linux 環境を構築することができます。

構築を進めるには 以下より Virtualbox と Vagrant をインストールする必要があります。

https://www.virtualbox.org/wiki/Downloads

https://www.vagrantup.com/downloads.html

## Vagrant のセットアップ

まずは、以下のコマンドを実行して Vagrant の box ファイルをダウンロードします。


```bash
$ vagrant box add laravel/homestead
```

::: tip
Vagrant の box ファイルダウンロードには、ネットワークの状況にもよりますが、
非常に時間がかかるケースがあります。
:::

ダウンロードを進めながら、Homestead のプロジェクトテンプレートをダウンロードします。

```bash
$ git clone https://github.com/laravel/homestead.git ~/Homestead
```

ダウンロードできたら、作成された `Homestead` フォルダに移動して、 `release` ブランチをチェックアウトします。

```bash
$ cd ~/Homestead
$ git checkout release
```

最後に、セットアップのスクリプトを実行します。

Mac の場合は、以下のようなコマンドで、

```bash
// Mac / Linux...
$ bash init.sh
```

Windows の場合は、以下のようなコマンドになります。

```bash
// Windows...
$ init.bat
```

## Homestead の設定

セットアップスクリプトを作成して、作成される `Homestead.yaml` は、
Homestead 環境の設定ファイルです。

`folders` のセクションには、Vagrant の Shared Folders の設定を記述するようになっており、
ローカルの PC パスと、Vagrant 内の仮想環境のパスを同期させることができます。

```bash
folders:
    - map: ~/code
      to: /home/vagrant/code
```

上記のような設定の場合、 vagrant 内の `/home/vagrant/code` と ローカルの `~/code` フォルダとが同期され、
同じ内容のファイルが展開されるようになります。

ファイルを同期するために以下のコマンドで、同期用のフォルダを作成しておきましょう。

```bash
$ mkdir ~/code
```

## Vagrant の設定

Vagrant 仮想環境を立ち上げるには、`Vagrantfile` のあるフォルダで、`vagrant up` コマンドを実行します。

```bash
$ vagrant up 
```

立ち上がった Vagrant 環境には `vagrant ssh` コマンドでログインすることができます。

```bash
$ vagrant ssh
```

::: tip
`vagrant ssh` で鍵関連のエラーが出る場合は、
`ssh-keygen -t rsa` コマンドを実行して鍵ファイルの作成を行ってください。
:::

::: tip
ssh でログインすると コンソールの表示が `vagrant@` に切り替わります。
vagrant から抜けるには `exit` コマンドを実行します。
:::


作業が完了して仮想環境のリソースを開放する場合、 `vagrant halt` で仮想環境を停止させることができます。

```bash
$ vagrant halt
```

作成した仮想環境を完全に削除したい場合、 `vagrant destroy` コマンドを利用します。

```bash
$ vagrant destroy
```

## Laravel 環境のセットアップ

Vagrant 環境の用意ができたら、実際に Laravel の セットアップを進めていきましょう。

```bash
$ vagrant ssh 
```

cd で ローカルとコード同期されている、 `code` フォルダまで移動して、
`laravel new` コマンドで Laravel の初期構成をセットアップします。

```
$ cd code
$ laravel new 
```

最後にブラウザで `http://homestead.test` または `http://192.168.10.10/` にアクセスして Laravel の初期画面が表示されたらセットアップは完了です。

### ローカルのデータベースに接続する

デフォルトの 構成では、 MySQL データベースへの接続設定がセットアップされています。

MySQL Workbench などのツールを利用して、データベースの中身が見れるようにしておきましょう。

https://dev.mysql.com/downloads/workbench/

ツールがダウンロードできたら、以下の接続情報で Vagrant 内のデータベースに接続することができます。

- host : `127.0.0.1`
- port : `33060` 
- username : `homestead`
- password : `secret`

::: tip 
PostgreSQL を利用する場合は ポート番号 `54320` を利用します。
ホスト名、ユーザ名、パスワードは同じものが利用可能です。
:::



参考

https://laravel.com/docs/6.x/homestead

