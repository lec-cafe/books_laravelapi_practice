---
---

# REST API の設計

REST API は、プログラムでアクセスする分、
一般の Web サイトルートと違ってかなり複雑な設計が可能になります。

REST API の構成要素は、リクエストとレスポンスからなり、それぞれ以下のような要素を検討する必要があります。

- リクエスト： URL や HTTP Method、Request Body や Request Header
- レスポンス： ステータスコードや,Response Body や Response Header

## ルートに関する設計

リクエストにおける、URL や HTTP Method は、ルートの記述によって設定します。

API のルートは、`routes/api.php` に、以下のように Route クラスを用いて記述します。

```php
<?php
Route::get("/status",function(){
    //...
});
```

Route クラスは、HTTP Method を利用して 
`Route::get` `Route::post` `Route::put` `Route::patch` `Route::delete` のように記述できます。

第一引数には URL を指定し、第２引数に処理を行う関数を記述します。

::: warning
定義したメソドと異なる メソドでリクエストを受けた場合、Laravel は 405 のステータスコードを返します。
:::

同一の URL でもメソド違いで異なる API を作成することが可能です。

```php
<?php
Route::get("status", function(){
    return [
      "status" => "OK",
      "message" => "this is get api"
    ];
});

Route::post("status", function(){
    return [
      "status" => "OK",
      "message" => "this is post api"
    ];
});
```


### URL Parameter

URL の内部で `{ }` を指定すると、任意の文字にマッチするようになります。

```php
<?php 
Route::patch("/task/{id}",function($id){
    $task = \App\Task::find($id);
    if($task){
        $task->name = request()->get("name");
        $task->save();
    }    
    return [];
});
```

上記のルートは `/api/task/1` や `/api/task/2` にマッチするようになり、
関数の引数 `$id` には それぞれ `1` `2` が渡されます。

### API Prefix

`routes/api.php` 内で作成された REST API は URL に `/api/` のプレフィックスが付与されます。

API の動作設定は、 `app/Providers/RouteServiceProvider.php` に記述されており、
これを修正することで、その挙動を変更することができます。

```php
    protected function mapApiRoutes()
    {
        Route::prefix('api') // URL に付与される プレフィックス
             ->middleware('api') // ミドルウェアのグループ
             ->namespace($this->namespace) // アクションクラスのデフォルト名前空間
             ->group(base_path('routes/api.php'));
    }
```

## リクエスト

### リクエストボディ

API のリクエストでは リクエストボディとして、様々なパラメータを送信することができます。

一般的に REST API では JSON 形式の リクエストボディが用いられ、ルート内では `request()->input()` の形式で、
JSON からデータを取得することが可能です。

例えば、以下のようなルートは JSON 形式のリクエストボディ `{"name":"牛乳を買う"}` から、
name の項目を取り出すことができます。

```php
<?php
Route::post("/task",function(){
    $task = new \App\Task();
    $task->name = request()->input("name");
    $task->save();
    return [];
});
```

単純に リクエストボディ全体を取得したい場合には、 `request()->all()` を取得します。

```php
<?php
Route::post("/status",function(){
    return [
        "payload" => request()->all()    
    ];
});
```

::: warning
HTTP Method が `GET` `DELETE` の場合、リクエストボディにデータをセットすることは、一般的にふさわしくありません。
:::

### リクエストヘッダ

API のリクエストでは、ヘッダと呼ばれる追加項目で、パラメータを送信することもできます。
リクエストボディがメインのパラメータとして用いられるのに対し、リクエストヘッダはサブのパラメータとしての位置づけで用いられることが多いです。

ヘッダから情報を取得するには、`request()->header()` を用います。

```php
<?php
Route::post("/search",function(){
    $category = request()->input("category");
    $limit = request()->header("X-COUNT");
    
    $books = \App\Book::where("category",$category)
        ->limit($limit)
        ->get();
    return $books;
});
```

上記の API では、 ヘッダ項目 `X-COUNT` から取得する件数を指定できるようにしています。

::: tip
REST API における HTTP 通信では、標準で様々なヘッダ情報が付与されています。
自分で任意に作成する ヘッダ項目には、名前の重複を避けるために `X-` の接頭辞を付与するのがマナーです。
:::

## レスポンス

一般的に API のレスポンスは、JSON 形式で送信されます。

Laravel では ルート内で 配列をreturn することで、自動的にJSON形式のレスポンスを生成することができます。

```php
<?php
Route::get("status", function(){
    return [
      "status" => "OK",
      "message" => "no issues with systemn"
    ];
});
```

複数のキーや深い階層の配列を利用しても問題なくレスポンスを生成できます。

REST API のレスポンスは、メインの情報である レスポンスボディの他に、
ステータスコードやヘッダといった補足的な情報を添えることができます。

- ステータスコード： API の結果の形式を、数値で表す
- レスポンスヘッダ： API の補足的な情報を表現する

ステータスコードは、HTTP通信においては、一般的な成功の際には `200`  のステータスコードとなりますが、
データが存在しない場合には `404` システムエラーの場合には `503` など、
応答の種別によって適切な値をを返すのが好ましいケースもあります。

また、レスポンスヘッダは、API 通信における補足的な返却情報です。
例えばユーザの一覧を返却する API では、
レスポンスボディで JSON 形式のユーザリストを返却し、
ページングの情報を レスポンスヘッダで返す、などといった使われ方をするケースもあります。

ステータスコードやレスポンスヘッダを ルート内で定義する場合には以下のように `response` 関数を利用します。

第一引数に JSON にすべき レスポンスボディの配列、
第二引数に、ステータスコードを、第三引数に レスポンスヘッダを指定することが可能です。

```php
<?php
Route::get("status", function(){
    //...
    $headers = [
        "X-PAGE" => 1
    ];
    return response([
        "message" => "hello world"
    ],200,$headers);
});
```

また、API 通信では、認証やメタ情報を ヘッダを用いて送信することもあります。
ヘッダの値は `request()->header("hogehoge")` の形式で取得することも可能です。

::: tip
REST API における HTTP 通信では、標準で様々なヘッダ情報が付与されています。
自分で任意に作成する ヘッダ項目には、名前の重複を避けるために `X-` の接頭辞を付与するのがマナーです。
:::

## REST API と Guzzle の通信

Guzzle は PHP で REST API を叩くための ライブラリです。

composer を利用して以下のような形でインストールします。


```bash
$ composer require guzzlehttp/guzzle
```

今回は Connpass の API をインストールしてみましょう.
Connpass の API 仕様は以下の Webページで公開されています。

https://connpass.com/about/api/

Guzzle を使ってこの API を利用して、REST APIとして実装するためには以下のようなルートを記述します。

```php
<?php
use GuzzleHttp\Client;

Route::get("/connpass",function(){

    $client = new Client();
    $response = $client->request("GET","https://connpass.com/api/v1/event/");
    $responseBody = json_decode($response->getBody()->getContents(),true);

    return [
        "status" => "OK",
        "events" => $responseBody,
    ];
});
```

そのまま `$responseBody` を返すのではなく、必要なデータだけに絞ったり、
パラメータを利用して、結果を整形することも可能です。



## CORS の対応

Laravel で 作成した REST API を CORS 対応させる場合、laravel-cors のライブラリを利用するのが便利です。

https://github.com/barryvdh/laravel-cors

laravel-cors を利用するには、 composer でモジュールをインストールします。
Service Provider は Auto Discovery で自動認識されるため登録は不要です。 

```
$ composer require barryvdh/laravel-cors
```

API に CORS 対応を入れる場合、ミドルウェアとして `\Barryvdh\Cors\HandleCors::class` を登録します。

```php
<?php
Route::get('status', function () {
    //
})->middleware(\Barryvdh\Cors\HandleCors::class);
```


### CORS の設定

CORS の詳細な設定を行う場合、 設定ファイルを利用して管理を行います。

以下のコマンドを実行すると `config/cors.php` が生成され、 CORS の詳細な設定を行うことができるようになります。

```
$ php artisan vendor:publish --provider="Barryvdh\Cors\ServiceProvider"
```

生成される `config/cors.php` は以下のような形になります。

```
return [
     /*
     |--------------------------------------------------------------------------
     | Laravel CORS
     |--------------------------------------------------------------------------
     |
     | allowedOrigins, allowedHeaders and allowedMethods can be set to array('*')
     | to accept any value.
     |
     */
    'supportsCredentials' => false,
    'allowedOrigins' => ['*'],
    'allowedHeaders' => ['Content-Type', 'X-Requested-With'],
    'allowedMethods' => ['*'], // ex: ['GET', 'POST', 'PUT',  'DELETE']
    'exposedHeaders' => [],
    'maxAge' => 0,
];
```



