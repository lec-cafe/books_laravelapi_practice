module.exports = {
    title: 'Laravel REST API 開発 入門',
    description: 'HTML/CSS を使った Web 制作技術について、現場で使えるテクニックを紹介します。',
    head: [
        ['script', { src: "https://static.codepen.io/assets/embed/ei.js"}]
    ],
    locales: {
        '/': {
            lang: 'ja',
        },
    },
    markdown: {
        anchor: {
            level: [1,2,3],
            slugify: (s) => encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-')),
            permalink: true,
            permalinkBefore: true,
            permalinkSymbol: '#'
        },
        config: md => {
            md.use(require('markdown-it-playground'))
        },
        linkify: true
    },
    themeConfig: {
        nav: [
            { text: 'Lec Café', link: 'https://leccafe.connpass.com/' },
        ],
        sidebar: [
            '/1.アプリケーションの設計/',
            '/2.Laravel と Repositoryパターン/',
            '/3.Laravel と DI/',
            '/実践演習/',
          {
            title: '補足資料',
            children: [
              '/9.環境構築 Vagrant/',
              '/9.環境構築 Mac/',
            ]
          },
        ],
        repo: 'lec-cafe/book_laravel_api',
        repoLabel: 'Github',
        docsDir: 'books',
        editLinks: true,
        editLinkText: 'ページに不明点や誤字等があれば、Github にて修正を提案してください！'
    }
}
