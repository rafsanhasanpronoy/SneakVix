# SneakVix

SneakVix is a full-stack sneaker e-commerce platform with a static frontend, Django REST API, PostgreSQL database, image-search service, customer accounts, cart and checkout workflows, order management, and an admin panel.

## Live Application

- **Frontend:** (https://sneakvix-frontend.onrender.com/)
- **Backend API:** https://sneakvix.onrender.com
- **API base URL:** `https://sneakvix.onrender.com/api`
- **Database:** PostgreSQL hosted by Supabase
- **Image storage:** Supabase Storage

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Netlify hosting
- Supabase Storage for product and brand images

### Backend

- Python
- Django
- Django REST Framework
- Simple JWT authentication
- PostgreSQL
- Gunicorn
- Render hosting

### Supporting Services

- Supabase PostgreSQL
- Supabase Storage
- Resend for transactional email
- Separate image-search service

## Core Features

### Customer Features

- Browse sneaker products
- Search products
- Filter by brand and price range
- Sort products by newest, price, and name
- Product detail pages with multiple images
- EU size and quantity selection
- Guest shopping cart using browser storage
- Authenticated server-side shopping cart
- Guest-cart merge after login or signup
- Customer registration and login
- JWT access/refresh authentication
- Automatic access-token refresh
- Checkout and delivery information
- Order creation and order history
- Manual bKash payment instructions
- Order confirmation email when email delivery is available
- Light/dark theme
- Responsive frontend
- Sneaker image search

### Inventory Features

- Product-specific EU sizes
- Per-size stock quantities
- Duplicate-size prevention
- Stock validation on cart operations
- Transactional stock deduction during checkout
- Protection against overselling during concurrent checkout attempts
- Product deletion protection when historical orders reference the product

### Admin Features

- Admin-only dashboard
- Product listing and statistics
- Add products
- Edit products
- Delete products when permitted
- Product image upload to Supabase Storage
- Product size and stock management
- Order listing and order details
- Order status management
- User management
- Admin authorization enforced by the backend API

## Authentication and Authorization

SneakVix uses JWT authentication through Django REST Framework Simple JWT.

- Access and refresh tokens are used by the frontend.
- Authenticated API requests send the access token in the `Authorization` header.
- Expired access tokens can be refreshed automatically using the refresh token.
- Product browsing is publicly accessible.
- Product mutations, order administration, user administration, and other protected operations require appropriate permissions.
- Admin API operations require an authenticated user with the `admin` role.

## Email

Transactional email is supported through Resend.

The backend uses the Resend email backend when `RESEND_API_KEY` is configured. If the key is not available, Django falls back to its console email backend for local/development use.

Example environment variables:

```env
RESEND_API_KEY=re_xxxxxxxxx
DEFAULT_FROM_EMAIL=your-verified-sender@example.com
```

Do not commit real API keys, passwords, database credentials, or other secrets to the repository.

## Environment Variables

### Backend (Render)

Typical production configuration includes:

```env
SECRET_KEY=your_secret_key
DEBUG=False
ALLOWED_HOSTS=sneakvix.onrender.com
DATABASE_URL=postgresql://...
CORS_ALLOWED_ORIGINS=https://sneakvix.netlify.app
```

Optional email configuration:

```env
RESEND_API_KEY=re_xxxxxxxxx
DEFAULT_FROM_EMAIL=your-verified-sender@example.com
```

Actual production secrets should be configured through Render environment variables and should never be committed to GitHub.

## Deployment

### Frontend — Netlify

Deploy the `frontend/` directory as the static site.

The frontend API configuration points to:

```text
https://sneakvix.onrender.com/api
```

### Backend — Render

The Django backend is deployed from the `backend/` directory.

Build command:

```bash
pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
```

Start command:

```bash
gunicorn config.wsgi:application
```

### Database — Supabase

The application uses PostgreSQL through Supabase. Database migrations are applied by Django during deployment.

## Project Structure

```text
SneakVix/
├── backend/
│   ├── config/
│   ├── store/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── admin/
│   ├── css/
│   ├── js/
│   ├── *.html
│   └── assets/
├── .vscode/
├── README.md
└── requirements.txt
```

The exact contents may evolve as the application is developed.

## API Overview

The Django REST API is available under:

```text
https://sneakvix.onrender.com/api/
```

Major API areas include:

```text
/api/auth/
/api/products/
/api/cart/
/api/checkout/
/api/orders/
/api/users/
/api/image-search/
```

Protected endpoints require JWT authentication, and administrative operations require the appropriate admin role.

## Development

### Backend

From the `backend/` directory:

```bash
python manage.py migrate
python manage.py runserver
```

For a local production-style server:

```bash
gunicorn config.wsgi:application
```

### Frontend

The frontend is composed of static HTML, CSS, and JavaScript files. During local development, serve the `frontend/` directory with a static HTTP server rather than opening the HTML files directly when browser/API behavior requires an HTTP origin.

## Data and Inventory Notes

Product inventory is tracked by product and EU shoe size. A product can have multiple size records, but a size can appear only once for a given product.

Checkout performs stock deduction transactionally and validates that sufficient stock remains before decrementing inventory.

## Payment Notes

The current checkout uses a **manual bKash payment workflow**. The application creates the order first and displays the configured bKash payment instructions and order reference to the customer. Payment verification is handled separately; this is not a direct bKash API/payment-gateway integration.

## Security Notes

The application includes several production-oriented security measures, including HTTPS redirection, secure cookies, content-type sniffing protection, referrer policy, frame protection, JWT authentication, backend permission checks, and transactional inventory updates.

Security-sensitive values must remain in environment variables. Frontend code must not contain private API keys or database credentials.

## Testing and Quality

Important areas to test before production changes include:

- Authentication and token refresh
- Guest and authenticated cart behavior
- Guest-cart merging
- Product and size validation
- Inventory limits and concurrent checkout
- Checkout totals and order creation
- Order status changes
- Admin authorization
- Product image upload
- Image-search failures and malformed responses
- Frontend HTML escaping and XSS resistance
- API rate limiting and abuse protection

## Current Status

Implemented and deployed:

- Product catalog and product details
- Search, filtering, and sorting
- Guest and authenticated carts
- JWT authentication
- Checkout and order creation
- Transactional inventory management
- Manual bKash payment instructions
- Transactional email integration through Resend
- Admin dashboard and management pages
- Supabase PostgreSQL integration
- Supabase Storage integration
- Image-search functionality
- Netlify frontend deployment
- Render backend deployment

Potential future improvements include:

- Full online payment-gateway integration
- Coupon and promotion support
- More advanced sales analytics
- API rate limiting and throttling
- Additional security hardening such as a stricter Content Security Policy
- Improved automated test coverage
- Expanded product and order reporting

## License

Private project for SneakVix.
