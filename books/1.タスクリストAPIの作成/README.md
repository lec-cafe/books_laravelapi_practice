---
title: タスクリストAPIの開発
---

# タスクリストAPIの開発

REST API は HTTP 通信を利用してデータの受け渡しを実現するためのシンプルなWebシステムの形です。

通常の Laravel アプリケーションのように View を用いて HTML を生成するのではなく、
データのやり取りは単純なJSON の形式で行われます。

Webシステムを、REST API 形式で構築することにより、フロントエンドのWebアプリケーションや、iOS / Android などの ネイティブアプリケーションなど
様々な場面で Laravel を用いた データベースシステムを活用する事ができるようになります。

まずははじめに、シンプルなタスクリストの API を作成して、
REST API 形式の Webシステムを構築するフローを確認してみましょう。

## タスクリストAPIの設計

シンプルなタスクリストアプリケーションでは、
タスクの登録と削除、それにタスクの一覧取得が必要になります。

REST API は、それぞれの機能に URL と HTTP Method を与えて、
Web 経由でリクエスト可能な機能を提供します。

HTTP Method には、 `GET` `POST` `PUT` `PATCH` `DELETE` などの種別があり、  
それぞれ `取得(GET)` `各種処理(POST)` `データの追加(PUT)` `データの更新(PATCH)` `データの削除(DELETE)`
などの意味が与えられています。

これから シンプルなタスクリストアプリケーションの API を作成するにあたり、
以下のような 3 本の API 構築を目標にしてみましょう。

- `GET /tasks` タスク一覧を取得するAPI 
- `POST /task` タスクを作成するAPI
- `DELETE /task/{id}` 完了したタスクを削除するAPI

## データベースのセットアップ

DB を利用したアプリケーションを作成するために、
まずは、Laravel における Database の設定を行いましょう。

Laravel アプリケーションがデータベースに接続可能なように、
`.env` ファイルに接続の設定を記述します。

デフォルトの状態では、homestead で環境構築を行った場合の、
MySQL 接続設定が記述されています。

homestead の MySQL以外、例えば sqlite で Laravel に接続する場合、`.env` ファイルは以下のように書き換えます。

```.dotenv
DB_CONNECTION=sqlite
#DB_HOST=127.0.0.1
#DB_PORT=3306
#DB_DATABASE=homestead
#DB_USERNAME=homestead
#DB_PASSWORD=secret
```

sqlite を使用するために `database/database.sqlite` を作成しておきましょう。

```bash
$ touch database/database.sqlite
```

### テーブルの作成

データベースの接続設定ができたら、まずはテーブルを作成しましょう。
マイグレーションコマンドを実行して、マイグレーションファイルを作成します。

```bash
$ php artisan make:migration todo
```

作成されたマイグレーションファイルに以下のようなタスクテーブル用のDB定義を記述します。

```php
public function up(){
    //テーブル作成
    Schema::create('tasks', function (Blueprint $table) {
        $table->increments('id');
        $table->string('name');
        $table->timestamps();
    });
}

public function down(){
    //テーブル削除
    Schema::dropIfExists('tasks');
}
```

以上でDBの設定とマイグレーションの準備が整いました。
最後にmigrateコマンドを実行して完了です。

```bash
$ php artisan migrate
```

`migrate` コマンドは データベース にテーブルを作成するためのコマンドで、
実行された順番を記録して、次回新しくマイグレーションのファイルを追加した際に続きからの実行を行ってくれます。

既存のマイグレーションファイルを編集した際など、マイグレーションを最初から実行し直したいときは `migrate:fresh` コマンドを実行します。

```bash
$ php artisan migrate:fresh
```

migration のより詳しい使い方は、

https://laravel.com/docs/6.x/migrations

を参考にしてください。

### Eloquent の準備

テーブルが作成できたらタスクを投入するための、Eloquent Model を作成しましょう。

`app/Task.php` を作成し以下のように記述します。

```
<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $table = "tasks";

}
```

Laravel では この `Illuminate\Database\Eloquent\Model` クラスを継承して作成したモデルクラスを利用して、
テーブルに対する様々な操作を行うことができます。

## タスク追加 API の作成

準備が整ったので実際に REST API を作成していきましょう。

API に関する情報はすべて `routes/api.php` に記述します。

まずは、タスクを追加する API `POST /task` を作成するため、
以下のようなかたちで POST の API を定義します。

```php
<?php
Route::post("/task",function(){
    $task = new \App\Task();
    $task->name = request()->input("name");
    $task->save();
    return [];
});
```

上記の形式で作成した API は、Postman などのツールを用いて以下の形式でリクエスト可能です。

- URL: `/api/task`
- METHOD: `POST`
- BODY: JSON `{"name":"牛乳を買う"}`

[Postman \| Download Postman App](https://www.getpostman.com/downloads/)

リクエストを発行して実際にデータベースにデータが追加されることを確認してみましょう。

API 経由で送られた JSON のデータは、
`request()->get("name")` のようにして取得することができます。

上記のコードでは `\App\Task` クラスを作成して、name 列に JSON のデータを格納し、
`save` でデータベースにデータを保存します。

## タスク一覧を取得するAPI

次に、タスクの一覧を取得する API `GET /tasks` を作成します。
`GET` の API は以下のような形で `Route::get` を用いて `routes/api.php` に記述します。

```php
<?php
Route::get("/tasks",function(){
    return \App\Task::all();
});
```

上記の形式で作成した API は、Postman などのツールを用いて以下の形式でリクエスト可能です。

- URL: `/api/tasks`
- METHOD: `GET`

API リクエストを実行すると、
レスポンスに JSON 形式でタスクの一覧が表示され、先程追加したデータが表示されるのが確認できるでしょう。

Laravel で記述した ルート関数では、return した内容がそのままレスポンスとして利用されます。
配列 `[]` や Eloquent のコレクションを return にわたすことで、
自動的に JSON 形式に変換されて REST API として機能する様に動作させることができます。

JSON 形式への変換は再帰的に行われるため、以下のように任意の配列構造を作成することもできます。

```php
<?php
Route::get("/tasks",function(){
    return [
        "status" => "OK",
        "tasks" => \App\Task::all(),
    ];
});
```

## タスクを更新・削除するAPI

最後に、タスクを削除する API `GET /task/{id}` を作成します。
`DELETE` の API は以下のような形で `Route::delete` を用いて `routes/api.php` に記述します。


通常 Webページを利用するシステムでは GET / POST の HTTP Method がよく用いられますが、
REST API では PATCH / PUT / DELETE などの HTTP Method もよく用いられます。

```php
<?php
Route::delete("/task/{id}",function($id){
    $task = \App\Task::find($id);
    if($task){
        $task->delete();
    }    
    return [];
});
```

Route で URL を記述する際に `/task/{id}` のように `{ }` を利用して記述すると、
その部分は任意の文字列にマッチするようになります。 

マッチした文字列は 関数の引数として `$id` のように取得可能です。

`\App\Task::find($id)` は ID を指定して Eloquent のモデルを取得する方法で、
取得した オブジェクトに対して `delete` をコールすることで、
該当のオブジェクトを削除することが可能になります。

Eloquent のより詳しい使い方は以下を参考にしてください。

https://laravel.com/docs/5.8/eloquent

