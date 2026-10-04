// ---------- Settings ----------
const SERVICES = [
  { name: "Initial consultation", desc: "A 60-minute session to talk through what you need." },
  { name: "Standard session", desc: "Our most booked appointment, one-to-one." },
  { name: "Extended session", desc: "More time for complex or ongoing work." },
  { name: "Follow-up", desc: "A short check-in after a previous visit." }
];
const TIME_SLOTS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const STATUSES = ["pending", "confirmed", "cancelled", "completed"];
const SLOT_TAKEN_MSG = "Sorry, this time slot is already booked. Please select another time.";

let isAdmin = false; // true when the admin is signed in

const $ = (id) => document.getElementById(id);

// ---------- Small UI helpers ----------
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = "message " + (type === "success" ? "success" : "error-msg");
  el.hidden = false;
}
function hideMessage(el) { el.hidden = true; }
function setFieldError(id, text) {
  document.querySelector(`[data-for="${id}"]`).textContent = text;
  $(id).classList.toggle("invalid", Boolean(text));
}

// ---------- Page setup ----------
function setupPage() {
  $("year").textContent = new Date().getFullYear();

  $("service").innerHTML = '<option value="">Select a service</option>';
  SERVICES.forEach((s) => {
    $("service").add(new Option(s.name, s.name));
    const card = document.createElement("div");
    card.className = "service";
    card.innerHTML = "<h3></h3><p></p>";
    card.querySelector("h3").textContent = s.name;
    card.querySelector("p").textContent = s.desc;
    $("services-list").appendChild(card);
  });

  $("booking_time").innerHTML = '<option value="">Select a time</option>';
  TIME_SLOTS.forEach((t) => $("booking_time").add(new Option(t, t)));

  // Don't allow past dates
  $("booking_date").min = new Date().toISOString().split("T")[0];
}

// ---------- Validation ----------
function validateForm(data) {
  const errors = {};
  if (data.full_name.length < 2) errors.full_name = "Enter your full name.";
  if (!/^\S+@\S+\.\S+$/.test(data.email)) errors.email = "Enter a valid email address.";
  if (!/^[+\d][\d\s\-()]{6,}$/.test(data.phone)) errors.phone = "Enter a valid phone number.";
  if (!data.service) errors.service = "Select a service.";
  if (!data.booking_date) errors.booking_date = "Select a date.";
  if (!data.booking_time) errors.booking_time = "Select a time.";
  ["full_name","email","phone","service","booking_date","booking_time"]
    .forEach((f) => setFieldError(f, errors[f] || ""));
  return Object.keys(errors).length === 0;
}

// ---------- Database operations ----------

// Returns true if no active booking exists for this date + time.
async function checkAvailability(date, time) {
  const { data, error } = await db
    .from("public_bookings")
    .select("id")
    .eq("booking_date", date)
    .eq("booking_time", time)
    .neq("status", "cancelled")
    .limit(1);
  if (error) throw error;
  return data.length === 0;
}

// CREATE
async function createBooking(data) {
  const available = await checkAvailability(data.booking_date, data.booking_time);
  if (!available) return { slotTaken: true };

  // No .select() here: the public (anon) role is not allowed to read full rows.
  const { error } = await db.from("bookings").insert(data);
  // 23505 = unique violation: someone booked the slot a moment ago.
  if (error && error.code === "23505") return { slotTaken: true };
  if (error) throw error;
  return { slotTaken: false };
}

// READ
async function fetchBookings() {
  // Admin sees the full table; everyone else sees the safe public view.
  const source = isAdmin ? "bookings" : "public_bookings";
  const { data, error } = await db
    .from(source)
    .select("id, full_name, service, booking_date, booking_time, status")
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });
  if (error) {
    showMessage($("bookings-message"), "Could not load bookings. Check your Supabase settings.", "error");
    console.error(error);
    return;
  }
  hideMessage($("bookings-message"));
  renderBookings(data);
}

// UPDATE (admin only, enforced by RLS)
async function updateBookingStatus(id, status) {
  const { error } = await db.from("bookings").update({ status }).eq("id", id);
  if (error) showMessage($("bookings-message"), "Could not update status: " + error.message, "error");
  await fetchBookings();
}

// DELETE (admin only, enforced by RLS)
async function deleteBooking(id) {
  if (!confirm("Delete this booking? This cannot be undone.")) return;
  const { error } = await db.from("bookings").delete().eq("id", id);
  if (error) showMessage($("bookings-message"), "Could not delete booking: " + error.message, "error");
  await fetchBookings();
}

// ---------- Rendering ----------
function renderBookings(bookings) {
  const box = $("bookings-list");
  box.innerHTML = "";
  if (bookings.length === 0) {
    box.innerHTML = '<p class="empty">No bookings yet. Be the first to book a slot above.</p>';
    return;
  }
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Time</th><th>Status</th>" +
    (isAdmin ? "<th>Actions</th>" : "") + "</tr></thead><tbody></tbody>";
  const tbody = table.querySelector("tbody");

  bookings.forEach((b) => {
    const tr = document.createElement("tr");
    [b.full_name, b.service, b.booking_date, b.booking_time.slice(0, 5)].forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text; // textContent prevents HTML injection
      tr.appendChild(td);
    });
    const statusTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge " + b.status;
    badge.textContent = b.status;
    statusTd.appendChild(badge);
    tr.appendChild(statusTd);

    if (isAdmin) {
      const actions = document.createElement("td");
      const select = document.createElement("select");
      STATUSES.forEach((s) => select.add(new Option(s, s, false, s === b.status)));
      select.setAttribute("aria-label", "Change status");
      select.addEventListener("change", () => updateBookingStatus(b.id, select.value));
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.addEventListener("click", () => deleteBooking(b.id));
      actions.append(select, " ", del);
      tr.appendChild(actions);
    }
    tbody.appendChild(tr);
  });
  box.appendChild(table);
}

// ---------- Event handlers ----------
async function handleSubmit(e) {
  e.preventDefault();
  const msg = $("form-message");
  hideMessage(msg);

  const data = {
    full_name: $("full_name").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    service: $("service").value,
    booking_date: $("booking_date").value,
    booking_time: $("booking_time").value,
    notes: $("notes").value.trim() || null
  };
  if (!validateForm(data)) return;

  const btn = $("submit-btn");
  btn.disabled = true;
  btn.textContent = "Booking…";
  try {
    const result = await createBooking(data);
    if (result.slotTaken) {
      showMessage(msg, SLOT_TAKEN_MSG, "error");
    } else {
      showMessage(msg, "Booking received! We'll confirm it shortly.", "success");
      $("booking-form").reset();
      fetchBookings();
    }
  } catch (err) {
    console.error(err);
    showMessage(msg, "Something went wrong while booking. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Book now";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const { error } = await db.auth.signInWithPassword({
    email: $("login-email").value, password: $("login-password").value
  });
  if (error) return showMessage($("bookings-message"), "Sign in failed: " + error.message, "error");
  await refreshAuthState();
}

async function handleAuthToggle() {
  if (isAdmin) {
    await db.auth.signOut();
    await refreshAuthState();
  } else {
    $("login-form").hidden = !$("login-form").hidden;
  }
}

async function refreshAuthState() {
  const { data } = await db.auth.getSession();
  isAdmin = Boolean(data.session);
  $("auth-toggle").textContent = isAdmin ? "Sign out" : "Staff sign in";
  $("login-form").hidden = true;
  fetchBookings();
}

// ---------- Start ----------
document.addEventListener("DOMContentLoaded", () => {
  setupPage();
  $("booking-form").addEventListener("submit", handleSubmit);
  $("login-form").addEventListener("submit", handleLogin);
  $("auth-toggle").addEventListener("click", handleAuthToggle);
  refreshAuthState();
});
