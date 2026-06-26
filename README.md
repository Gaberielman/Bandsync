# BandSync

BandSync is a mobile-first real-time synchronization app for live bands. A Host controls song, section, key, transpose, and key-change alerts while connected clients receive instant updates through Spring WebSocket STOMP messaging.

## Stack

- Java 17+
- Spring Boot 3.x
- Spring WebSocket + STOMP
- Vanilla JavaScript
- SockJS + StompJS
- Tailwind CSS

## Local Run

Start the Spring Boot backend:

```bash
mvn spring-boot:run
```

Then open the backend health check:

```text
http://localhost:8080/health
```

For local frontend testing, serve the `public/` folder with any static server and keep `public/config.js` pointed at:

```js
window.BANDSYNC_BACKEND_URL = 'http://localhost:8080';
```

## Deploy

This repo is set up as two deploy targets:

- Backend: Spring Boot WebSocket service, deploy with `Dockerfile` or `render.yaml`.
- Frontend: Vercel static site from the `public/` folder.

### 1. Deploy Backend

Use Render:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Render will use `render.yaml` / `Dockerfile`.
4. Copy the backend URL, for example:

```text
https://bandsync-backend.onrender.com
```

### 2. Connect Frontend To Backend

Edit `public/config.js`:

```js
window.BANDSYNC_BACKEND_URL = 'https://your-backend-url.onrender.com';
```

### 3. Deploy Frontend To Vercel

In Vercel:

1. Import the GitHub repo.
2. Framework preset: `Other`.
3. Output directory: `public`.
4. Deploy.

## Main Paths

- WebSocket endpoint: `/connect-bandsync`
- Send host/client actions: `/app/room/{roomId}/action`
- Subscribe to room updates: `/topic/room/{roomId}`
