---
title: OAS を使った API 仕様書の作成
---

# OAS 

Open API Specification(OAS) は API 仕様書を記述するための JSON フォーマットのドキュメントです。

昔は Swagger と呼ばれていたもので JSON / Yaml のフォーマットを用いて API 仕様書を記述することができるようになっています。

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md

## OAS でドキュメントを記述する

OAS でドキュメントを記述する際には、オンラインのエディタ Swagger-editor を利用する事ができます。

https://editor.swagger.io/

左側のエディタに OAS ドキュメントを入力すると、リアルタイムに右側でドキュメントのプレビューが表示されます。

OAS ドキュメントのサンプルは以下のリポジトリから取得することが可能です。

https://github.com/OAI/OpenAPI-Specification/tree/master/examples/v3.0

試しに、以下のようなドキュメントを エディタに記述して ドキュメントを確認してみましょう。

```yaml
openapi: "3.0.2"
info:
  version: 1.0.0
  title: OSA Sample Document
  license:
    name: MIT
servers:
  - url: http://laravel-api.lec.cafe/api
paths:
  /tasks:
    get:
      summary: タスクの一覧を取得する
      operationId: listTasks
      tags:
        - task
      parameters:
        - name: limit
          in: query
          description: 取得するタスクの件数 (max 100)
          required: false
          schema:
            type: integer
            format: int32
      responses:
        '200':
          description: タスクの一覧を表示する
          content:
            application/json:    
              schema:
                type: array
                items:
                  required:
                    - id
                    - name
                  properties:
                    id:
                      type: integer
                      format: int64
                    name:
                      type: string
```

`openapi`  は ドキュメントを記述する OAS のバージョンを指定します。現時点での最新のドキュメントは `3.0.2` となっています。

`info` はドキュメントのメタ情報を定義します。
`info.version` は OAS のバージョンとは異なる、ドキュメント自体のバージョン番号を表します。

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#info-object

`servers`では API をホストしている サーバを記述することができます。

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#server-object

`paths` は 各 API の定義を記述するセクションです。

### API の定義

OAS では API の各種定義は、`paths` のセクション内で行います。

`paths` の各セクション内に `paths.{URL}.{methods}` の形式で API 定義を追加していきます。

URL の中に パスパラメータを含む場合は `{}` でくくって記述することができます。

```yaml
paths:
  /tasks:
    get:
      summary: タスクの一覧を取得する
      ....
    post:
      summary: タスクを作成する。
      ....
  /task/{id}:
    get:
      summary: タスクの詳細情報を取得する
      ....
    delete:
      summary: タスクを削除する
      ....
```

HTTP メソドの下には Operation Object という形式で、API の仕様情報を記述していきます。

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#operation-object

```yaml
paths:
  /tasks:
    get:
      summary: タスクの一覧を取得する
      operationId: listTasks
      tags:
        - task
      parameters:
        ...
      responses:
        ...
```

`summary` は 簡単な API の説明文です。
詳細な API の使用説明が必要な場合、Markdown の形式で `description` セクションに記述することができます。

`tags` は それぞれの API をグループ化するのに便利な項目です。 配列の形式で複数記述することができます。

`operationId` は任意で添えられる API の ID 名称です。ドキュメント内で 各 API ごとに一意の値をつけなければなりません。

`parameters` はリクエストパラメータを定義するセクションです。

`requestBody` は リクエストボディの形式を定義します。

`responses` は レスポンスの形式を定義します。

### パラメーターの定義

リクエストパラメータは、`patameters` セクションにて、
Parameter Object という形式の オブジェクトで定義することができます。

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#parameter-object

```yaml
      parameters:
        - name: limit
          in: query
          description: 取得するタスクの件数 (max 100)
          required: false
          schema:
            type: integer
            format: int32
```

`in` セクションは、"query" "header" "path"  "cookie" と言った値を取ることができ、
それぞれに異なるタイプのリクエストパラメータを定義することができます。

- query : URL 内で ? を用いて添えられる クエリパラメータ
- header : リクエストヘッダ上で送信される パラメータ
- path: URL の一部として送信される パスパラメータ
- cookie : cookie を用いて送信されるパラメータ

`in` セクションの内容によって記述すべき項目が異なるため注意が必要です。

### リクエストボディの定義

リクエストボディは `requestBody` セクションにて、
Request Body Object という形式の オブジェクトで定義することができます。

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#request-body-object

```yaml
description: user to add to the system
content: 
  'application/json':
    schema:
      $ref: '#/components/schemas/User'
    examples:
      user:
        summary: User Example
        externalValue: 'http://foo.bar/examples/user-example.json'
```

contentType に応じて複数の RequestBody を定義することが可能になっていますが、
通常は `application/json` の形式を定義するだけで足るでしょう。

### レスポンスの定義

レスポンスは、`responses` セクションにて、
Response Object という形式の オブジェクトで定義することができます。

https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responses-object

```yaml
responses:
  '200':
    description: a pet to be returned
    content: 
      application/json:
        schema:
          $ref: '#/components/schemas/Pet'
  default:
    description: Unexpected error
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorModel'

```

レスポンスはステータスコードごとに定義しますが、
`1XX` `2XX` `3XX` `4XX` `5XX` のように大文字の `X` を用いて複数の帯域の ステータスコードをまとめて表現することも可能です。

### Sehcema の定義

パラメータや リクエストボディ、レスポンスにおいては、
schema というキーで その値の型を定義することができます。

schema は Schema Object という形の オブジェクトを用いて記述するか、
`$ref` を用いた参照の形式で記述する事ができます。

Schema Object は JSON Schema の形式で記述されるオブジェクト定義で、
オブエジェクトの持つキーや値の方などを指定することができます。

```yaml
type: object
required:
- name
properties:
  name:
    type: string
  address:
    type: string
  age:
    type: integer
    format: int32
    minimum: 0
```

Schema は JSON Schema で型を定義するだけではなく、
`example` のセクションを利用してその値の例を表現することも可能です。

```yaml
type: object
properties:
  id:
    type: integer
    format: int64
  name:
    type: string
required:
- name
example:
  name: Puma
  id: 1
```

`$ref` を用いた参照の形式で記述されたオブジェクトは、
OAS ドキュメントのルートに `components` セクションを設けて、
その形式を定義することができます。

```yaml
components:
  schemas:
    Pet:
      type: object
      discriminator:
        propertyName: petType
      properties:
        name:
          type: string
        petType:
          type: string
      required:
      - name
      - petType
    Cat:  ## "Cat" will be used as the discriminator value
      description: A representation of a cat
      allOf:
      - $ref: '#/components/schemas/Pet'
      - type: object
        properties:
          huntingSkill:
            type: string
            description: The measured skill for hunting
            enum:
            - clueless
            - lazy
            - adventurous
            - aggressive
        required:
        - huntingSkill
    Dog:  ## "Dog" will be used as the discriminator value
      description: A representation of a dog
      allOf:
      - $ref: '#/components/schemas/Pet'
      - type: object
        properties:
          packSize:
            type: integer
            format: int32
            description: the size of the pack the dog is from
            default: 0
            minimum: 0
        required:
        - packSize
```

components に記述したSchema 定義は、 `$ref: '#/components/schemas/XXX` の形式でドキュメント内から参照することができ、
再利用可能なスキーマ定義として利用することができます。

## ローカル環境でドキュメントを構築する

ローカル環境でドキュメントを構築するには、 Node の ツールを利用します。

```bash
$ npm i swagger-ui-dist json-refs
```

### swagger-ui

OAS 形式で記述された文書を HTML の Web ページとして表示するためのツールとして 
`swagger-ui` というツールが用意されています。

`swagger-ui-dist` はこの `swagger-ui` のビルド済みのファイル一式を提供するもので、
`public` 等の公開フォルダにそのまま一式移動させることで、簡単に ローカル環境で OAS 文書を閲覧することができるようになります。

npm 経由でインストールされた swagger-ui-dist のファイル群は `node_modules/swagger-ui-dist` に格納されるため、
以下のコマンドで public フォルダにその内容をコピーすることができます。

```bash
$ cp -R node_modules/swagger-ui-dist/ public/swagger
```

デフォルトでは、`https://petstore.swagger.io/v2/swagger.json` から読み込まれる
PetStoreAPI のドキュメントが表示されています。

作成された swagger フォルダの中にある `index.html` を確認すると、
コードの下部にある script のセクションで、 対象となる OAS ファイルの URL が指定されている箇所が見つけられるはずです。

```html
    <script>
    window.onload = function() {
      // Begin Swagger UI call region
      const ui = SwaggerUIBundle({
        url: "https://petstore.swagger.io/v2/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      })
      // End Swagger UI call region

      window.ui = ui
    }
  </script>
```

この URL の値を 任意の値、例えば `/swagger.json` などに修正することで、
自分で作成した OAS ドキュメントを Web 上で表示することができるようになります。

### json-refs

swagger-ui を使って任意の json を Web ページ化することができるようになったので、
次は Yaml ファイルを JSON に変換する方法を確認していきましょう。

swagger-ui-dist とともにインストールした json-refs は 
ローカルにある Yaml ファイルを json に展開してくれるツールです。

`swagger/api.yaml` に　OAS 定義を作成して以下のような形で JSON を生成することが可能です。

````bash
$ ./node_modules/.bin/json-refs resolve ./swagger/api.yaml > public/swagger.json
````

上記のコマンドを実行することで `./swagger/api.yaml` の内容がJSON形式で
 `public/swagger.json` に出力されます。

また json-refs は複数の Yaml ファイルを組み合わせてJSONを生成することも可能です。

まず、 メインの Yaml として``swagger/api.yaml` を以下のような形で作成します。

```yaml
openapi: "3.0.2"
info:
  version: 1.0.0
  title: OSA Sample Document
  license:
    name: MIT
servers:
  - url: http://laravel-api.lec.cafe/api
paths:
  /tasks:
    $ref: ./entries/tasks.yml
```

このドキュメントでは今度のAPIの追加に備え URL 以下の API 定義を 外部ファイルに記述して、
その参照を `$ref: ./entries/tasks.yml` という形で相対パスで記述しています。

API定義の本体となる `swagger/entries/tasks.yml` は以下のような形になるでしょう。

```yaml
get:
  summary: タスクの一覧を取得する
  operationId: listTasks
  tags:
    - task
  parameters:
    - name: limit
      in: query
      description: 取得するタスクの件数 (max 100)
      required: false
      schema:
        type: integer
        format: int32
  responses:
    '200':
      description: タスクの一覧を表示する
      content:
        application/json:    
          schema:
            type: array
            items:
              required:
                - id
                - name
              properties:
                id:
                  type: integer
                  format: int64
                name:
                  type: string
```

ドキュメントの用意ができたら、以下のコマンドでjson を出力可能です。

```bash
$ ./node_modules/.bin/json-refs resolve ./swagger/api.yaml > public/swagger.json
```

resolve コマンドの仕様詳細は以下のURLからも確認可能です。

https://github.com/whitlockjc/json-refs/blob/master/docs/CLI.md#the-resolve-command
