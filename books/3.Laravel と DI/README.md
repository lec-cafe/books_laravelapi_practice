# Laravel と DI

## DIの利用

各種ルートの内部で、Repository を new して利用していると、
後で Repository クラスを大幅に書き換え用とした際の実装が非常に困難になります。

```php
<?php
namespace App\Http\Controllers;

use App\Repository\TaskRepository;

class TaskListController
{
    public function handle()
    {
        $sort = request()->get("sort","DESC");
        $limit = request()->get("limit", 10);

        $repo = new TaskRepository();

        return [
            "tasks" => $repo->getList($sort,$limit)
        ];
    }
}
```

タスクのデータを Database から NoSQL / REST API 経由での取得に変更する際や、
テスト用に モックを作成する際など、別の Repository を利用したくなる開発上のニーズはあるでしょう。

Laravel では DI を利用してこうした要求を簡単に実現することが可能です。

```php
<?php
namespace App\Http\Controllers;

use App\Repository\TaskRepository;

class TaskListController
{
    protected $repo;

    public function __construct(TaskRepository $repo)
    {
        $this->repo = $repo;
    }

    public function handle()
    {
        $sort = request()->get("sort","DESC");
        $limit = request()->get("limit", 10);

        return [
            "tasks" => $this->repo->getList($sort,$limit)
        ];
    }
}
```

Laravel 側から利用されるクラスの多くでは、
constructor に引数で定義したオブジェクトが Laravel 側で自動的に用意されます。

これまでクラスの内部で用意(new) していたクラスが、
引数経由で外部から渡されるようになり、「依存性」を外部から「注入」することが可能になりました。

### DI コンテナの利用

DI コンテナは、「依存性の注入」と呼ばれる DI パターンの実現に用いられる
オブジェクトのコンテナです。

特定のコードが、その動作のために特定のコードを必要としているとき、
プログラミングの世界では「依存」という形でその関係性を定義します。
依存性の注入とは、そうした「依存」（必要なオブジェクト）をモジュールの内部で生成(new)するのではなく、
外から引数等を経由して取得しようという設計のパターンです。

依存オブジェクトを外から取得してくる処理を一般に「依存解決」といいます。

- 依存オブジェクトの要求に対して、何を作るか
- 依存オブジェクトの実体を誰がいつ作るか
- 作成された依存オブジェクトを誰が管理するか

と言ったテーマが依存解決を考える上で非常に重要で、
依存解決は、「依存性の注入(DI)」を考える上で非常に重要なテーマです。

Laravel の DI コンテナは、こうした依存解決を行うための仕組みを備え、
アプリケーション設計に柔軟な DI パターンの方針を提供してくれます。

Laravel では、フレームワークから利用される多くのクラスで、
constructor に引数で定義したオブジェクトに対する依存解決が自動で行われます。

こうした 依存オブジェクトの依存解決処理をカスタマイズするには、
Service Provider を利用するのが一般的です。

### Service Provider の利用

Service Provider を利用するには、以下のコマンドで Provider のスケルトンを作成します。

```bash
$ php artisan make:provider TaskServiceProvider
```

コマンドを実行することで、`app/Providers/TaskServiceProvider.php` が作成されているはずです。

作成した ServiceProvider を有効化するために `config/app.php` の `providers` セクションに、
以下のようにして `TaskServiceProvider` を追記しておきましょう。

```php 
<?php 
return [
    'providers' => [
        // ...
        App\Providers\EventServiceProvider::class,
        App\Providers\RouteServiceProvider::class,
        App\Providers\TaskServiceProvider::class,
    ],
];
```

ServiceProvider を以下のような形で記述することで、
引数に `TaskRespository` が与えられた際の 依存解決の挙動を定義することができます。

```php
<?php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repository\TaskRepository;

class TaskServiceProvider extends ServiceProvider
{
    public function register()
    {
        app()->singleton(TaskRespository::class,function(){
            return new TaskRepository();
        });
    }
}
```

特に上記のようなコードを記述しなくても、Laravel ではデフォルトで、
引数に与えられたクラス名をベースにオブジェクトを new した依存解決が行われますが、
オブジェクトを生成する際のコンストラクタの引数に特別な値を与えたい場合などのケースでは、
ServiceProvider を用いたカスタマイズが利用されます。

例えば、テスト用に `TaskRespository` のモック `TaskMockRespository`を作成し、
テスト時のみコレを利用する場合、以下のような記述になります。

```php
<?php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repository\TaskRepository;
use App\Repository\TaskMockRepository;

class TaskServiceProvider extends ServiceProvider
{
    public function register()
    {
        app()->singleton(TaskRespository::class,function(){
            if(env("APP_ENV") === "testing"){
                return new TaskMockRepository();                
            }else{
                return new TaskRepository();
            }
        });
    }
}
```

上記のように記述した ServiceProvider を有効化することで、
テスト時には、 `TaskRespository` と記述した引数の箇所で、
`TaskMockRespository` が解決されるようになります。

## インターフェイスの利用

`TaskRespository` に加えて、 `TaskMockRespository` などを作成するようになると、
ルート内での実装にやや不都合が生まれてきます。

以下のように書かれた Controller のコードも DI により解決されるオブジェクトが不定だと、
`TaskRepository` と記述するのが不正確になってきます。

```php
<?php
namespace App\Http\Controllers;

use App\Repository\TaskRepository;

class TaskListController
{
    protected $repo;

    public function __construct(TaskRepository $repo)
    {
        $this->repo = $repo;
    }
    // ...
}
```

`TaskRepository` に加えて `TaskMockRepository` など様々な種別のコードを記述することも想定して、
インターフェイスを記述して実装することで、コードはより正確にコードの状態を表現することができるようになります。

`app/Repository/TaskRepositoryInterface.php` を以下のような形で作成してみましょう。

```php
<?php
namespace App\Repository;

interface TaskRepositoryInterface
{
    public function getList($sort,$limit);
}
```

ルートは以下のような形で、 Repository 本体ではなく Interface に依存する形になります。

```php
<?php
namespace App\Http\Controllers;

use App\Repository\TaskRepositoryInterface;

class TaskListController
{
    protected $repo;

    public function __construct(TaskRepositoryInterface $repo)
    {
        $this->repo = $repo;
    }
    // ...
}
```

リポジトリでは、 `implements` キーワードを利用して、 
インターフェイスに定義されたメソドが用意されていることを示します。

```php
<?php
namespace App\Repository;

use App\Task;

class TaskRepository implements TaskRepositoryInterface
{
    public function getList($sort,$limit)
    {
        // ...
    }
}
```

最後に DI コンテナの依存解決処理を記述します。
引数にインターフェイスを与えた場合の、依存の自動解決はできないため、
常に ServiceProvider を利用して、インターフェイスに該当する Repository の指定を行う必要があります。

```php
<?php
namespace App\Providers;

use App\Repository\TaskRepository;
use App\Repository\TaskMockRepository;
use App\Repository\TaskRepositoryInterface;

use Illuminate\Support\ServiceProvider;

class TaskServiceProvider extends ServiceProvider
{
    public function register()
    {
        app()->singleton(TaskRepositoryInterface::class,function(){
            if(env("APP_ENV") === "testing"){
                return new TaskMockRepository();                
            }else{
                return new TaskRepository();
            }
        });
    }
    
    // ...
}
``` 

### 依存関係逆転の法則

これまでのコードでは、ルートがリポジトリの実装を利用していました。

リポジトリのコードが抽象と実装に分割されたため、
ルートは実装に依存することなく、抽象にのみ依存するようになりました。

また リポジトリの実装もルートから依存されることなく、
逆に抽象を利用して実装が行われるように変化しました。

依存される側だったリポジトリの実装が、
インターフェイスを依存する側の立場に変化するこの状態を「依存関係の逆転」といいます。

依存されるオブジェクトは、変更が困難という問題があります。
変更が起こりやすい実装の実体は、依存されるよりも依存するオブジェクトである方が変更管理上は安全です。
抽象のインターフェイスを利用することで、依存されていいたオブジェクトを依存する側に変更することで、
システムの柔軟性をより高めることができます。

## Laravel と DI

Laravel では DI の機能として、フレームワーク側から利用されるクラスの多くでは、
constructor に引数で定義したオブジェクトが 自動的に依存解決されるという処理が用意されています。
 
このような Laravel の DI 機能は、以下のような場面（主にララベルが内部で生成 or コールするクラス）で利用可能です。

- ルートクラスのコンストラクタ
- ルート関数の引数、ルートクラスのルートに相当するメソドの引数
- artisan クラスのコンストラクタ
- artisan の handle 関数
- Mailable クラスのコンストラクタ
- Job クラスのコンストラクタ
- Job クラスの handle 関数
- DI による自動解決で呼ばれるクラスのコンストラクタ

今回は `TaskRepository` という自身で作成したクラスを DI で解決しましたが、
`Illuminate\Http\Request` などの Laravel 内部のオブジェクトも DI 経由でコールすることができます。

```php
<?php
namespace App\Http\Actions;

use App\Repository\TaskRepository;
use Illuminate\Http\Request;

class TaskListAction
{
    protected $repo;

    protected $request;

    public function __construct(TaskRepository $repo,Request $request)
    {
        $this->repo = $repo;
        $this->request = $request;
    }
    // ...
}
```

DI コンテナ自体は、 Laravel のコード内であれば `app()` 関数を利用して簡単にアクセス可能です。

引数の形で記述しない場合でも以下のような形式で、
DI コンテナからオブジェクトを簡単に取り出すことができます。

```php
<?php
$request = app(\Illuminate\Http\Request::class);

$repository = app(\App\Repository\TaskRepository::class);
```

DI コンテナを用いて 各種サービスを取りまとめどこからでも利用可能にする設計のパターンは
一般的に サービスロケーターパターンと呼ばれ、依存解決のための手法としてよく用いられます。

::: tip
DI を使った依存解決に比べ、 サービスロケータによる依存解決は設計手法としては悪手とされるケースがほとんどです。
`app()` を使ってコンテナから直接依存オブジェクトを取り出すよりも 引数等を経由した DI の手法が利用できないか、
まず検討するほうが良いでしょう。
:::

### 依存解決へのフック

Laravel 内部でも様々なオブジェクトに対して依存解決時の処理が定義されており、
ServiceProvider として提供されています。

他の ServiceProvider で記述された依存解決処理を、
他の ServiceProvider からフックして書き換えるには、 
`app()->extend()` 関数を利用します。

以下は `app()->extend()` を利用して 前章の Request Guard の処理を追加する例です。

```php
<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

use Illuminate\Auth\AuthManager;
use Illuminate\Auth\RequestGuard;

class AuthServiceProvider extends ServiceProvider
{
    // ...
    public function register()
    {
        app()->extend(AuthManager::class,function(AuthManager $auth){
            $auth->extend('custom-token', function () use($auth) {
                $guard = new RequestGuard(function(){
                    $token = request()->bearerToken();
                    return \App\User::where("token",$token)->first();                    
                }, request(), $auth->createUserProvider());
    
                $this->app->refresh('request', $guard, 'setRequest');
    
                return $guard;
            });
        });        
    }
}
```

DI コンテナ上に登録された すべてのモジュールはこの様に extend を利用してその内部状態を
「各種システムから利用される前に」調整する事が可能になっています。
