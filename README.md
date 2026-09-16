# SneakVix — Django (Python) + plain HTML/CSS/JS

Same backend as before (unchanged), but the frontend is now plain
`.html` files with `<script>` tags using `fetch()` — **no Node, no npm,
no build step.**

```
scaffold2/
  backend/     Django + DRF + PostgreSQL   (identical to the React version)
  frontend/    plain HTML/CSS/JS, open directly or serve with any static server
```

## 1. Backend (same as before)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # edit DB_USER / DB_PASSWORD
python manage.py makemigrations store
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Runs at `http://localhost:8000`.

## 2. Frontend — no install step at all

You have two options:

**Option A — just double-click `index.html`**
Works for browsing, but `fetch()` calls to `localhost:8000` can behave
oddly from a `file://` URL in some browsers. Fine for a quick look.

**Option B — serve it with Python's built-in server (recommended)**
```bash
cd frontend
python3 -m http.server 5500
```
Then open `http://localhost:5500` in your browser. This matches the
`CORS_ALLOWED_ORIGINS` already set in the backend's `.env.example`.

That's it — no `npm install`, no `package.json`, no build tool. Every
`.html` file loads `js/api.js` (the fetch wrapper + JWT storage) and
`js/nav.js` (renders the navbar), then its own page-specific script.

## 3. Page map (mirrors your original PHP structure)

| Page | File | Talks to |
|---|---|---|
| Home | `index.html` | — |
| Product list | `products.html` + `js/products.js` | `GET /api/products/` |
| Product detail | `product.html?id=1` + `js/product.js` | `GET /api/products/:id/`, `POST /api/cart/` |
| Cart | `cart.html` + `js/cart.js` | `GET/DELETE /api/cart/` |
| Checkout | `checkout.html` + `js/checkout.js` | `POST /api/checkout/` |
| Login / Signup | `login.html`, `signup.html` | `/api/auth/...` |
| Profile / orders | `profile.html` + `js/profile.js` | `GET /api/orders/` |
| Image search | `image-search.html` + `js/image-search.js` | `POST /api/image-search/` |
| Admin products | `admin/products.html` | `GET /api/products/` |
| Admin orders | `admin/orders.html` | `GET/PATCH /api/admin/orders/` |

## 4. How auth works without a framework

`js/api.js` stores the JWT `access`/`refresh` tokens and the logged-in
user object in `localStorage`. Every page that needs a login calls
`requireLogin()` at the top of its script, which redirects to
`login.html` if there's no token. `js/nav.js` re-renders the navbar
on every page load by checking `isLoggedIn()`.

## 5. What still needs work (same list as before, still applies)

1. Admin product create/edit form — `admin/products.html` currently
   only lists products; add a `<form>` posting to
   `POST/PATCH /api/products/:id/` with a `sizes` array.
2. Order status emails (see backend README notes — same TODOs).
3. Styling — `css/style.css` is intentionally plain; restyle using
   your original look from `assets/css/style.css`.
4. Deployment — the backend deploys the same way as before (Gunicorn +
   Postgres). The frontend, being plain static files, can be hosted
   literally anywhere: Django's own `staticfiles`, Nginx, GitHub Pages,
   or any static host — just update `API_BASE` in `js/api.js` to your
   production API URL.

## 6. Suggested build order

Same as before: get the backend running with a couple of test
products → browse/cart/checkout end to end → login/signup →
admin order status updates → admin product form → image search →
styling → deploy.
