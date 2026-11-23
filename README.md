# FixHub: фронтенд

Веб-платформа услуг местных мастеров. React 19 + Vite, React Router.
Бэкенд: репозиторий `fixhub-be` (ASP.NET Core, порт 8080).

## Запуск

```bash
npm install
cp .env.example .env.local   # на Windows: copy .env.example .env.local
npm run dev                  # http://localhost:5173
```

Запросы `/api` и `/uploads` Vite проксирует на `http://localhost:8080` (см. `vite.config.js`),
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

## Роли

- **Client**: каталог, корзина, заказы, отзывы, профиль
- **Performer**: свои услуги, входящие заказы, отзывы, профиль
- **Admin**: пользователи, категории, отзывы, статистика
