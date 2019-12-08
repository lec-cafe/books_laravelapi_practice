---
title: Laravel におけるDI
---

# Laravel における DI

Laravel における DI は、モジュール間の依存関係を処理する重要な設計思想です。

ページのアプリケーションでは、複雑な View ロジックで
コードは複雑になりがちですが、 REST API のように Response 周りのロジックが
シンプルな構造のシステムは、工夫次第でコードの可読性・柔軟性を大きく改善できます。

Laravel における DI の仕組みを理解しながら、クラス設計の基礎を理解していきましょう。

## Action クラスの生成

まずは Route の処理をクラスに記述するようコードを修正していきましょう。

`App\Task` Eloquent を利用してタスクの一覧を生成するAPIを
`app/Http/Actions/TaskListAction.php` を作成して以下のように記述します。

```php
<?php
namespace App\Http\Actions;

use App\Task;

class TaskListAction
{
    public function handle()
    {
        $query = new Task();
        $query = $query->orderBy("created_at",request()->get("sort","DESC"));
        $query = $query->limit(request()->get("limit", 10));

        return [
            "tasks" => $query->get()
        ];
    }
}
```

より実際に即した処理にするため、多少のロジックを入れています。

リクエストパラメーターの `sort` でソート順が変更可能となっており、
`limit` で取得件数を変更できます。それぞれ `DESC` `10` の初期値が用意されています。

このルートを有効に動作させるためには、
まず `app/Providers/RouteServiceProvider.php` で 
`mapApiRoutes` のデフォルトの名前空間を無効化します。

```php
protected function mapApiRoutes()
{
    Route::prefix('api')
         ->middleware('api')
//         ->namespace($this->namespace)
         ->group(base_path('routes/api.php'));
}
```

次に `routes/api.php` で以下のようにルートを定義すれば準備は完了です。

```php
Route::get("task/list",\App\Http\Actions\TaskListAction::class."@handle");
```

実際にAPIにアクセスして正しく動作が行われているか確認してみましょう。

## Repository パターンの利用

これまでのコードでは、DB 関連の処理を直接 Eloquent 経由で実施してきました。

しかし、アプリケーション全体を眺めた際に、Eloquent の提供する機能は膨大で大きすぎるため、
これらを直接 ルートから利用するのは、危険なケースも多々あります。

アプリケーションの中で DB へのアクセスを制御しようとするとき、
一般的に Repository パターンと呼ばれる手法がよく用いられます。
Repository パターンでは、Repository と呼ばれるクラスを定義して、
アプリケーション内での DB 操作をひとまとめに管理します。

タスクテーブルへのクラスの操作を制御するための `TaskRepository` を作成するために、
`app/Repository/TaskRepository.php` を作成して以下のようなコードを記述してみましょう。

```php
<?php
namespace App\Repository;

use App\Task;

class TaskRepository
{
    public function getList($sort,$limit)
    {
        $query = new Task();
        $query = $query->orderBy("created_at",$sort);
        $query = $query->limit($limit);

        return $query->get();
    }

}
```

ルートから利用する場合は以下のようなコードになります。

```php
<?php
namespace App\Http\Actions;

use App\Repository\TaskRepository;

class TaskListAction
{
    public function handle()
    {
        $repo = new TaskRepository();

        $sort = request()->get("sort","DESC");
        $limit = request()->get("limit", 10);

        return [
            "tasks" => $repo->getList($sort,$limit)
        ];
    }
}
```

上記の様に `TaskRepository` クラスを作成して `tasks` テーブルへの操作を
Eloquent ではなく `TaskRepository` クラスに経由に限定することで、
アプリケーション全体で `tasks` テーブルに対してどの様な操作がされているのか
ひと目で把握することができるようになります。

DB に対する処理の中には、特に DB の負荷を増大させるような重たい検索処理や、
ルール・想定に違反するような書き込み・更新・削除処理が含まれることもあるため、
万能な Eloquent をアプリケーション全体で利用するよりも、
このようにして Repository を作成して機能を制限するほうが安全です。

### Repository の設計

先に作成したリポジトリのコードを見てみましょう。

```php
<?php
namespace App\Repository;

use App\Task;

class TaskRepository
{
    public function getList($sort,$limit)
    {
        $query = new Task();
        $query = $query->orderBy("created_at",$sort);
        $query = $query->limit($limit);

        return $query->get();
    }

}
```

Repository の設計で重要なのは Repository には DB 操作に関するコードのみを記載するということです。

Repository は API のフォーマット等を意識する必要がない（意識してはならない）ため、
ソートのパラメータ等は、`request()` 関数経由で取得するのではなく、
引数で直接取得するようにしています。

引数リストは 以下のような形でデフォルト値付きで記述することもできますが、
「デフォルト値が何か」といったことも、「API の仕様」の範囲なので、
これも `Repository` 内では記述しません。

```php
    public function getList($sort="DESC",$limit=10)
    {
        // ...
    }
```

Repository は純粋な DB 操作のみをコードとして表現するクラスです。
 `request()` によるリクエスト関連処理だけでなく、
ページアプリケーションでの セッションや、
認証関連処理も Repository からは除外する方が良いでしょう。 

API の仕様に左右されない、純粋な　機能表現としての DB 操作を Repoisitory に落とし込むことで、
後述する自動テストでの利便性や、変更に対して強いアプリケーション構成を整えることができます。

## ValueObject の利用

上記の様な形の Repository を作成したところで、実はまだ完璧とは言えません。

Repository の `getList` メソドの戻り値は Eloquent で取得できるため、
Action では`getList`の戻り値を利用して、簡単に Eloquent の機能を利用することができます。

この様な問題に対応するためには、 ValueObject と呼ばれる単純なデータのみを扱うクラスを作成する必要があります。

`app/ValueObject/TaskObject.php`を作成して以下のようなコードを記述してみましょう。

```php
<?php

namespace App\ValueObject;

use Carbon\Carbon;

class TaskObject
{
    public $name;

    public $createdAt;

    public function __construct(string $name,Carbon $createdAt)
    {
        $this->name = $name;
        $this->createdAt = $createdAt;
    }
}
```

ValueObject では tasks テーブルの中でアプリケーションにとって必要な情報のみを
プロパティとして定義し、単純なデータの入れ物として作成します。

Eloquent をこの ValueObject に変換するためには Eloquent に以下のようなメソドを追加します。

```php
<?php

namespace App;

use App\ValueObject\TaskObject;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $table = "tasks";

    public function toValueObject(){
        return new TaskObject(
            $this->name,
            $this->created_at
        );
    }
}
```

Repository は以下のように修正して作業完了です。

```php
<?php
class TaskRepository
{
    public function getList($sort="DESC",$limit=10)
    {
        $query = new Task();
        $query = $query->orderBy("created_at",$sort);
        $query = $query->limit($limit);

        $result = $query->get();

        $rtn = [];
        foreach ($result as $row) {
            $rtn[] = $row->toValueObject();
        }
        return $rtn;
    }
}
```

Repository 内部で取得した Eloquent の結果セットを、
Eloquent にて定義した `toValueObject` メソドを用いて
ValueObject に変換し、Eloquent ではない結果セットを return するように変更しています。

これで、ルート内から Eloquent の利用を防ぐことが可能になりました。

### ValueObject のJSON整形

上記の例で実際に API リクエストを投げると以下のようなレスポンスが帰ってきます。

```json
{
    "tasks": [
        {
            "name": "牛乳を買う",
            "createdAt": {
                "date": "2019-01-31 11:29:17.000000",
                "timezone_type": 3,
                "timezone": "UTC"
            }
        },
        // ....
    ],
}
```

Carbon で表現されている 日付情報がそのまま内部のデータを含めてJSON化されているため、
やや利用しづらいフォーマットになっています。

ValueObject のような単純な JSON 形式のデータを整形するには、
以下の様に ValueObject に対し `JsonSerializable` インターフェイスを実装します。

```php
<?php
namespace App\ValueObject;

use Carbon\Carbon;

class TaskObject implements \JsonSerializable
{
    public $name;

    public $createdAt;

    public function __construct(string $name,Carbon $createdAt)
    {
        $this->name = $name;
        $this->createdAt = $createdAt;
    }

    public function jsonSerialize()
    {
        return [
            "name" => $this->name,
            "createdAt" => $this->createdAt->format("Y-m-d H:i:s")
        ];
    }
}
```

JsonSerializable インターフェイスはオブジェクトが JSON 化された際の挙動を制御する
インターフェイスです。 `jsonSerialize` メソドの中で任意の配列を return することで
JSON 化された際の表現形式を制御する事ができます。

## DI の利用

先程までのコードでは ルートの中で直接 Repository を new して利用していました。

Repositoy の中でも Eloquent を利用しています。

特定のコードが、その動作のために特定のコードを必要としているとき、
プログラミングの世界では「依存」という形でその関係性を定義します。

例えば先程までのコードはルートは Repository に依存しており、 Repository は Eloquent に依存しています。

依存オブジェクトの調達を行うことを一般に「依存解決」といいます。

- 依存オブジェクトの要求に対して、何を作るか
- 依存オブジェクトの実体を誰がいつ作るか
- 作成された依存オブジェクトを誰が管理するか

と言ったテーマが依存解決を考える上で問題としてあがりうるため、
依存解決はコードの本質的な処理とは別の設計上の大きな関心ごとです。

DI は Dependency Injection の略で、日本語では「依存性の注入」と呼ばれる概念です。
要するに「依存」関係にあるコードは、内部で生成するよりも外部から持ち込むべき、という考え方です。

例えば 先程までのルートのコードは DI の形式で記述すると以下のような形になるでしょう。

```php
<?php
namespace App\Http\Actions;

use App\Repository\TaskRepository;

class TaskListAction
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

ルートの内部で new していたリポジトリを、コンストラクタ経由で引数として渡すように書き換えられています。
単純な引数記述とは異なり、引数の型を明記することで何が必要なモジュールかを明示しています。

この書き換えられたルートの記述では、ルートがその動作に必要なオブジェクトを生成したり管理したりする責任を負いません。
ルートの処理に必要だった Repository は、ルートの内部で用意するのはなく、外部から渡されるようになりました。

DI と呼ばれるコードのパターンでは、特定のコード上で必要なオブジェクトを引数経由で受け取るようにすることで、
オブジェクトの生成や管理に関する問題をクラスの外部に追いやることができます。
逆に言えば、依存解決に関する問題はコードの外部に追いやられただけなので、
オブジェクトの生成は、DI による記述が行われているコードの外で そのモジュールを利用する側が責任をもななければなりません。

Laravel では DI 形式で記述された一部のクラスで、こうした DI 形式で記述した引数の自動解決の機能が設けられています。
 
上記のルートのコードでも、DI 形式で記述した引数は自動的に Laravel 側で用意され、
正しく リポジトリがルートに渡されます。 
 
このような Laravel の DI 機能は、以下のような場面（主にララベルが内部で生成 or コールするクラス）で利用可能です。

- ルートクラスのコンストラクタ
- ルート関数の引数、ルートクラスのルートに相当するメソドの引数
- artisan クラスのコンストラクタ
- artisan の handle 関数
- Mailable クラスのコンストラクタ
- Job クラスのコンストラクタ
- Job クラスの handle 関数
- DI による自動解決で呼ばれるクラスのコンストラクタ

### DI コンテナによる依存解決

DI の目的は、「依存解決の外部化」にありました。

DI 形式で記述されたルートや artisan, Job などのクラスを適切に動作させるために、
Laravel では 依存解決の仕組み、DI コンテナが用意されています。 
DI コンテナは連想配列形式でオブジェクトを管理するグローバルなコンテナオブジェクトです。

通常 Laravel で DI を行う上では、 ほとんど DI コンテナのことを意識する必要はありませんが、
特殊な DI による解決を行う際に、DI コンテナの操作が必要になります。

Laravel の基本的なモジュール群はその殆どが DI コンテナ上に格納されており、
DI を経由して DI コンテナからそのオブジェクトを受け取ることができます。

例えば `request()` 関数で取得可能な Request クラスのオブジェクトは以下の形式で取得することも可能です。

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

    public function handle()
    {
        $sort = $this->request->get("sort","DESC");
        $limit = $this->request->get("limit", 10);

        return [
            "tasks" => $this->repo->getList($sort,$limit)
        ];
    }
}
```

上記では `Illuminate\Http\Request` というクラス名で Request クラスを取得しています。

他にも、 `Illuminate\Mail\Mailer` で Mail クラスを取得したり、
`Illuminate\Database\DatabaseManager` で DB クラスを取得したり、
`Illuminate\Auth\AuthManager` で Auth クラスを取得したりできます。

DI コンテナは Laravel のコードであれば `app()` 関数を利用して簡単にアクセス可能です。

DI を利用しない場合でも以下のような形式で、DI コンテナからオブジェクトを簡単に取り出すことができます。

```php
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

Laravel では 習慣的に、`app()` を利用した DI コンテナへの操作は 
ServiceProvider 上で行うのが好ましいとされています。
例えば `app()->extend()` 関数は、DI コンテナ上に登録されたオブジェクトに
特定の処理を施すことができます。

以下は `app()->extend()` を利用して 前章の Request Guard の処理を追加する例です。

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
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

## 依存関係の逆転

DIパターンにより、依存の外部化は実現できたものの、
まだアプリケーションとして健全な状態ではありません。

依存は外部化できているものの、ルートなどのより具体的な処理は特定の処理実装に依存すべきではありません。

例えば、タスク一覧APIが欲しいのは、具体的なDBアクセスの処理そのものではなく、
条件を渡せばタスクの配列を返す、という入力と結果のみです。

一般的には「抽象に依存せよ」と呼ばれるもので、より抽象的な処理概念にルートを依存させるため、
インターフェイスを用いる事ができます。

`app/Repository/TaskRepositoryInterface.php` を以下のような形で作成してみましょう。

```php
<?php
namespace App\Repository;

interface TaskRepositoryInterface
{
    public function getList($sort,$limit);
}
```

ルートは以下のような形になるでしょう。

```php
<?php
namespace App\Http\Actions;

use App\Repository\TaskRepositoryInterface;

class TaskListAction
{
    protected $repo;

    public function __construct(TaskRepositoryInterface $repo)
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

リポジトリはこのインターフェイスを利用して、以下のように変更されます。

```php
<?php
namespace App\Repository;

use App\Task;

class TaskRepository implements TaskRepositoryInterface
{
    public function getList($sort,$limit)
    {
        $query = new Task();
        $query = $query->orderBy("created_at",$sort);
        $query = $query->limit($limit);

        $result = $query->get();

        $rtn = [];
        foreach ($result as $row) {
            $rtn[] = $row->toValueObject();
        }
        return $rtn;
    }
}
```

これでルートはリポジトリに依存することなく、リポジトリの抽象、
インターフェイスに依存するようになりました。

注目すべきは、リポジトリがインターフェイスを利用している（依存しいる）点です。
これまで依存される側だったリポジトリがインターフェイスの登場で依存する側へと変化しています。
これが「依存関係逆転の法則」と呼ばれるものです。

依存されるオブジェクトは、変更が困難という問題があります。
変更が起こりやすい実装の実体は、依存されるよりも依存するオブジェクトである方が変更管理上は安全です。
抽象のインターフェイスを利用することで、依存されていいたオブジェクトを依存する側に変更することで、
システムの柔軟性をより高めることができます。

### DIコンテナによるインターフェイスの解決

リポジトリクラスをDIした際と異なり、インターフェイスを使った DI では
依存解決がうまく行えず、実行時にエラーとなってしまいます。

クラスによる DI では クラス名 `` で依存オブジェクトを検索し、
該当するクラスを見つけて自動的に依存オブジェクトを生成することが可能ですが、
DI コンテナによる依存解決は インターフェイス名 ` ` で検索しても
利用可能なクラス実体を見つけ出す事ができません。

このため、ServiceProvider 上で以下のようにして
インターフェイスと実体のヒモ付を行う必要があります。
`app/Providers/AppServiceProvider.php` を利用して以下のように記述しましょう。
 
```php
<?php
namespace App\Providers;

use App\Repository\TaskRepository;
use App\Repository\TaskRepositoryInterface;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register()
    {
        app()->singleton(TaskRepositoryInterface::class,function(){
            return  new TaskRepository();
        });
    }
    
    // ...
}
``` 

register セクションで DI コンテナへの操作を記述しています。

`singoleton` は DI コンテナにモジュールを 登録するメソドで、
`TaskRepositoryInterface` のクラス名で、`TaskRepository` の生成を紐づけて登録しています。

この記述を行うことで、引数に `TaskRepositoryInterface` を記述した際に `TaskRepository` が
自動的に注入されるようになります。

## サービスの設計

アプリケーションを開発する上で、特定の機能をクラスに分割して再利用可能な状態に置くことは
とても重要なコトです。

しかし、大量のクラスを生成してしまうと、クラス同士の依存関係はとても複雑になり、
システム設計の全容を把握するのがとても困難になります。

機能をクラスに分割しながら、なおかつシステムの全体をよりシンプルに保つための工夫として、
いくつかのクラス設計のポイントを抑えておきましょう。

### 単一責務の原則

クラスは、たった一つの責任のためにコードが記述されるべきという考え方を「単一責務の原則(SRP)」
クラスが全うすべき責任の範囲が明確化されていない場合、一つのクラスが様々なことを行ってしまい、
異なる用途で複数箇所からクラスが依存されてしまうなどの問題が生じます。

原則、クラスは一つの責任を全うすべきですし、万一クラスが複数の問題に対して
適用可能な状態となっている場合には、インターフェイスを用いて機能を分離(ISP:インターフェイス分離の原則)する事が望ましいでしょう。

古くからクラスの設計として SOLID 原則という考え方がよく参照されます。
SOLID 原則は以下の 5 つの考え方の頭文字をとったもので、一つ一つが柔軟なクラス設計を考える上での重要な指標になる考え方です。

- 単一責務の原則 Single Responsibility Principle (SRP)
- オープンクローズドの原則 Open Closed Principle (OCP)
- リスコフの置換原則 Liskov Substitution Principle (LSP)
- インターフェース分離の原則 Interface Segregation Principle (ISP)
- 依存性逆転の原則 Dependency Inversion Principle (DIP)

### レイヤードアーキテクチャ

クラスの責務を検討する上で、アプリケーション内での働きを層状に把握する事は非常に効果的です。

例えば ルートから DB のデータを取得する、といったケースを考えたとき、以下の様なレイヤーが考えられます。

- DB 層 : データベースへの接続と SQL 処理を行う層
- Gateway(Repository) 層 : DB 層を用いてアプリケーションに必要な DB 操作を提供する層
- UseCase層 : Gateway 層を用いて アプリケーションに必要なビジネスロジックを記述する層
- アプリケーション層 : リクエストを受け取り UseCase 層を用いてルートの処理を提供する層

それぞれのレイヤーは、仕様変更に対する影響度合いを定義しており、
レイヤーを分割する事により、仕様変更の度合いに応じて生じる修正範囲を最小限に留める働きを持っています。

アプリケーションを層状に把握して、それぞれのレイヤーに適切な責務を担当させて
アプリケーション全体の依存の流れを管理する考え方を レイヤードアーキテクチャと呼びます。
上記のレイヤー分割とその命名は Clean アーキテクチャと呼ばれる、レイヤードアーキテクチャの一種から借用したものですが、
レイヤードアーキテクチャの分野では他にも様々な形のレイヤー設計が提案されています。

### ステートレスなクラス設計

クラスはプロパティを用いて、その内部に状態をもたせることが可能ですが、
クラス内部に用意された状態は、時として条件付きバグの温床になります。

クラス内プロパティが特定の値に書き換えられているケースでのみ A のメソドをコールすると例外が発生、
などと言ったバグは、原因検出も困難で障害調査のコストを大幅に増加させるでしょう。

この様な問題を回避するためには、クラスプロパティを利用せず、
単純なメソドのみを用いたクラス設計を行うのがベストです。

クラス内に用意された「状態」は一般的に「ステート」と呼ばれ、
クラス内に状態を持たないクラスを ステートレスなクラス、と呼びます。
