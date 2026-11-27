# FixHub: фронтенд

Веб-платформа услуг местных мастеров. React 19 + Vite, React Router.
Бэкенд: репозиторий `fixhub-be` (ASP.NET Core, порт 8080).

## Запуск

```bash
npm install
cp .env.example .env.local   # на Windows: copy .env.example .env.local
npm run dev                  # http://localhost:5173
```

Запросы `/api`, `/uploads` и `/share` Vite проксирует на `http://localhost:8080` (см. `vite.config.js`),
поэтому бэкенд должен быть запущен (`docker compose up` в `fixhub-be`).

## Настройки (`.env.local`)

| Переменная | Назначение |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Client ID для входа через Google. Тот же, что в `Google:ClientId` бэкенда. В Google Cloud в «Authorized JavaScript origins» должен быть `http://localhost:5173`. |

## Скрипты

- `npm run dev`: сервер разработки
- `npm run build`: production-сборка в `dist/`
- `npm run lint`: проверка ESLint
- `npm run preview`: просмотр сборки

## Продакшен

В `dist/` лежит статика. Либо отдавайте её с того же домена, что и API (обратный прокси для `/api` и `/uploads`),
либо задайте на бэкенде `Cors:AllowedOrigins` с адресом фронтенда.

## Карта и геопоиск

Карта на Leaflet и тайлах OpenStreetMap подключается с CDN (unpkg) при первом показе карты, в `package.json`
библиотеки нет. Мастер ставит точку в профиле (`/performer/profile`), точность хранения около 1 км.
Клиент в каталоге нажимает «Найти мастеров рядом», выбирает радиус и сортировку «Сначала ближайшие».
Для офлайн-сборки или строгого CSP поставьте `leaflet` через npm и замените `src/utils/leaflet.js`.

## Превью ссылок в мессенджерах

Приложение — SPA, а краулеры Telegram, WhatsApp и VK JavaScript не выполняют, поэтому обычная ссылка
`/services/5` во всех чатах выглядит одинаково. Кнопка «Поделиться» на страницах услуги и мастера отдаёт ссылку
`/share/services/5` или `/share/performers/3`: бэкенд возвращает HTML с Open Graph-тегами (название, цена, фото)
и сразу перенаправляет человека на сайт. Заголовок вкладки и описание страниц ставит `useDocumentMeta`.

В продакшене проксируйте `/share` на бэкенд. Чтобы превью работало и для обычных ссылок, пример для nginx:

```nginx
map $http_user_agent $is_preview_bot {
    default 0;
    ~*(TelegramBot|WhatsApp|vkShare|facebookexternalhit|Twitterbot|Slackbot|Viber) 1;
}

location ~ ^/(services|performers)/(\d+)$ {
    if ($is_preview_bot) { rewrite ^/(services|performers)/(\d+)$ /share/$1/$2 break; proxy_pass http://api:8080; }
    try_files /index.html =404;
}
location /share/ { proxy_pass http://api:8080; }
```

## Роли

- **Client**: каталог, корзина, заказы, отзывы, профиль
- **Performer**: свои услуги, входящие заказы, отзывы, профиль
- **Admin**: пользователи, категории, отзывы, статистика

## CSS: правила

- Цвета, ширины, радиусы, высоты полей и слои лежат в `src/tokens.css`. Числами в других файлах их не пишем.
- Ширина контента: `.container` (`--w-wide`, 1320) и `.container--narrow` (`--w-narrow`, 760 + поля) для форм и текстовых страниц. Кабинеты выровнены по тому же краю, что шапка.
- Радиусы: `--r-sm` 8, `--r-md` 12 (поля, кнопки), `--r-lg` 16 (карточки, окна), `--r-pill`.
- Поля и кнопки: `--ctl-h` 46 и `--ctl-h-sm` 38.
- Слои: только `--z-*`. Цвета: только семантические токены (`--surface`, `--line`, `--text`...); тёмная тема меняет их значения в `tokens.css`.
- Классы страниц начинаются с префикса страницы (`adm-`, `ord-`, `pf-`, `sp-`...). Общие классы живут в `index.css`.
- `npm run lint:css` проверяет дубли классов и `@keyframes`, числа вместо токенов и старые токены.
