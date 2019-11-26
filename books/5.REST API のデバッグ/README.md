---
---

# REST API開発におけるデバッグ

これまで PHP アプリケーションのデバッグに、`var_dump` や `dd` を利用していた人にとって、
REST API でのデバッグ実行は非常に分かりづらいものになるかもしれません。

REST API でのデバッグ実行には、`var_dump` や `dd` のような画面に表示するタイプのデバッグが利用できないため、
デバッグのフローにも工夫が必要になります。


## Telescope を使ったデバッガの導入

Laravel アプリケーションで REST API を作るときに面倒になってくるのがデバッグ周りの取扱です。

Laravel 5.7 からは 新しく telescope と呼ばれる デバッガが導入されたため、これを使ったデバッグの方法を確認してみましょう。


## 導入

telescope を利用するには、関連モジュールを composer 経由でインストールします。

```
$ composer require laravel/telescope
```

インストールが完了したら、`telescope:install` の artisan コマンドを実行して関連ファイルを作成します。 
データベースのセットアップが必要なため `migrate` の実行も行います。

```
$ php artisan telescope:install
$ php artisan migrate
```

`telescope:install` で生成されるのは以下のファイル群となります。

- TelescopeServiceProvider
- config/telescope.php 
- public/vendor/telescope　配下の assets 群

また config/app.php にも ServiceProvider の追加が行われます。

以後の telescope バージョンアップ等の更新に対応する際には、`php artisan telescope:publish` を利用することができます。

## Telescope の利用

セットアップが完了すると、 `/telescope` のアドレスで telescope の管理画面を確認することができます。

![](/images/9/telescope.png)

発行された API の リクエスト パラメータや レスポンスなど、様々な情報が時系列で確認できるようになっていあす。

### Telescope の機能一覧

Telescope で確認可能な項目として以下のようなものが用意されています。

- Request
- Commands
- Schedule
- Job
- Exception
- Logs
- Dumps
- Queries
- Models
- Mail
- Notification
- Gates
- Cache
- Redis


## Telescope の管理

Telescope はアプリケーションのログ情報を、常に テーブルへと格納していきます。

この挙動は、bool 値の環境変数 `TELESCOPE_ENABLED` で管理が可能となっており、
false に設定した場合、アプリケーションのログ出力は行われなくなります(ダッシュボードは有効)。

### 認証

telescope の管理画面は デフォルトの状態では、環境変数 `APP_ENV=local` の状態でのみ有効です。

staging や production の環境で利用するためには、
Laravel の認証機能を利用して、

`\App\Providers\TelescopeServiceProvider::gate`

に信頼できるユーザのEmail アドレスを追加する必要があります。
(ログイン機能等は自分で実装する必要があります。)

### データの削除

データを削除する場合、`telescope:prune` メソドでデータを削除できます。

```
$ php artisan telescope:prune
```

古いデータのみ削除する場合には、`--hours` オプションでデータの期限を指定します。

```
$ php artisan telescope:prune --hours=48
```
