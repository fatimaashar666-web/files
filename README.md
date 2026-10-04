# Clearday Studio – Booking Website

Plain HTML, CSS and JavaScript with Supabase as the backend. No framework, no build step.

```
booking-website/
├── index.html     page structure
├── style.css      styling
├── script.js      app logic (createBooking, fetchBookings, updateBookingStatus, deleteBooking, checkAvailability)
├── supabase.js    Supabase client + your URL / anon key
├── setup.sql      table, unique slot index, RLS policies, public view
└── README.md
```

## Supabase setup
1. Create a project at supabase.com.
2. Open **SQL Editor**, paste `setup.sql`, and change `admin@example.com` to your admin email. Run it.
3. **Authentication > Users > Add user**: create that admin email with a password.
4. **Authentication > Providers/Sign In**: turn OFF "Allow new users to sign up" so only you can be an admin.
5. **Project Settings > API**: copy the Project URL and the `anon` public key into `supabase.js`.
   Never use the `service_role` key in frontend code.

## Run locally
Open `index.html` in a browser, or serve the folder:
`python3 -m http.server 8000` then visit http://localhost:8000

## How security works (RLS)
- RLS is enabled on `bookings`; nothing is allowed unless a policy permits it.
- Visitors (anon) can only INSERT, and only with status `pending`. They cannot read, update or delete rows.
- The public list and availability check read from the `public_bookings` view, which has no email, phone or notes.
- Only the signed-in admin email can read full rows, change status, or delete.
- A unique index blocks double-booking at the database level, even if two people submit at once.
- The anon key is meant to be public; RLS is what protects the data.

## Features
Responsive layout, form validation, loading state, success/error messages, availability check, public booked-slots list with empty state, admin status updates and delete with confirmation.
