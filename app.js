// ============================================================
// CONFIG — Loaded from config.js (ENV object)
// ============================================================
const API_URL = ENV.API_URL;

// ============================================================
// STATE
// ============================================================
let customers = [];
let currentFilter = "all";
let deleteTargetId = null;

// ============================================================
// DOM REFERENCES
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const searchInput = $("#searchInput");
const addCustomerBtn = $("#addCustomerBtn");
const modalOverlay = $("#modalOverlay");
const modalTitle = $("#modalTitle");
const modalClose = $("#modalClose");
const cancelBtn = $("#cancelBtn");
const customerForm = $("#customerForm");
const saveBtn = $("#saveBtn");

const customerIdField = $("#customerId");
const customerNameField = $("#customerName");
const customerPhoneField = $("#customerPhone");
const customerCompanyField = $("#customerCompany");
const customerStatusField = $("#customerStatus");
const customerNotesField = $("#customerNotes");

const deleteOverlay = $("#deleteOverlay");
const cancelDeleteBtn = $("#cancelDeleteBtn");
const confirmDeleteBtn = $("#confirmDeleteBtn");

const tableContainer = $("#tableContainer");
const customerTableBody = $("#customerTableBody");
const loader = $("#loader");
const emptyState = $("#emptyState");
const toast = $("#toast");

// Stats
const totalCount = $("#totalCount");
const leadCount = $("#leadCount");
const activeCount = $("#activeCount");
const prospectCount = $("#prospectCount");

// ============================================================
// API HELPERS
// ============================================================
async function apiRead() {
  const res = await fetch(`${API_URL}?action=read`);
  const json = await res.json();
  return json.data || [];
}

async function apiCreate(data) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "create", ...data }),
  });
  return res.json();
}

async function apiUpdate(data) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "update", ...data }),
  });
  return res.json();
}

async function apiDelete(id) {
  const res = await fetch(`${API_URL}?action=delete&id=${encodeURIComponent(id)}`);
  return res.json();
}

// ============================================================
// RENDER
// ============================================================
function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status) {
  return `status-badge--${(status || "lead").toLowerCase()}`;
}

function getFiltered() {
  let list = customers;
  const query = searchInput.value.trim().toLowerCase();

  if (currentFilter !== "all") {
    list = list.filter((c) => c.status === currentFilter);
  }

  if (query) {
    list = list.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(query) ||
        (c.phone || "").toLowerCase().includes(query) ||
        (c.company || "").toLowerCase().includes(query) ||
        (c.notes || "").toLowerCase().includes(query)
    );
  }

  return list;
}

function renderStats() {
  totalCount.textContent = customers.length;
  leadCount.textContent = customers.filter((c) => c.status === "Lead").length;
  activeCount.textContent = customers.filter((c) => c.status === "Active").length;
  prospectCount.textContent = customers.filter((c) => c.status === "Prospect").length;

  // Animate numbers
  [totalCount, leadCount, activeCount, prospectCount].forEach((el) => {
    el.style.animation = "none";
    void el.offsetHeight; // trigger reflow
    el.style.animation = "fadeUp 0.3s ease both";
  });
}

function renderTable() {
  const filtered = getFiltered();

  if (customers.length === 0) {
    tableContainer.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tableContainer.classList.remove("hidden");

  if (filtered.length === 0) {
    customerTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 48px 20px; color: var(--text-muted);">
          No customers match your search.
        </td>
      </tr>`;
    return;
  }

  customerTableBody.innerHTML = filtered
    .map(
      (c, i) => `
    <tr style="animation-delay: ${i * 0.04}s">
      <td>
        <div class="customer-name-cell">
          <div class="customer-avatar">${getInitials(c.name || "?")}</div>
          <span class="customer-name">${escapeHtml(c.name)}</span>
        </div>
      </td>
      <td class="customer-phone">${escapeHtml(c.phone)}</td>
      <td class="customer-company">${escapeHtml(c.company)}</td>
      <td>
        <span class="status-badge ${statusClass(c.status)}">${escapeHtml(c.status)}</span>
      </td>
      <td>
        <div class="customer-notes">${escapeHtml(c.notes || "—")}</div>
      </td>
      <td class="customer-date">${formatDate(c.created)}</td>
      <td class="td-actions">
        <button class="btn-icon" title="Edit" onclick="openEdit('${c.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-icon--danger" title="Delete" onclick="openDelete('${c.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>`
    )
    .join("");
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// TOAST
// ============================================================
let toastTimeout;
function showToast(msg) {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.add("show");
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(title = "Add Customer") {
  modalTitle.textContent = title;
  modalOverlay.classList.remove("hidden");
  customerNameField.focus();
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  customerForm.reset();
  customerIdField.value = "";
}

function openDeleteModal() {
  deleteOverlay.classList.remove("hidden");
}

function closeDeleteModal() {
  deleteOverlay.classList.add("hidden");
  deleteTargetId = null;
}

// ============================================================
// CRUD ACTIONS
// ============================================================
async function loadCustomers() {
  loader.classList.remove("hidden");
  tableContainer.classList.add("hidden");
  emptyState.classList.add("hidden");

  try {
    customers = await apiRead();
    renderStats();
    renderTable();
  } catch (err) {
    console.error("Failed to load customers:", err);
    showToast("⚠️ Failed to load data. Check your API URL.");
  } finally {
    loader.classList.add("hidden");
  }
}

async function saveCustomer(e) {
  e.preventDefault();

  const data = {
    name: customerNameField.value.trim(),
    phone: customerPhoneField.value.trim(),
    company: customerCompanyField.value.trim(),
    status: customerStatusField.value,
    notes: customerNotesField.value.trim(),
  };

  const id = customerIdField.value;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    if (id) {
      await apiUpdate({ id, ...data });
      showToast("✅ Customer updated!");
    } else {
      await apiCreate(data);
      showToast("✅ Customer added!");
    }
    closeModal();
    await loadCustomers();
  } catch (err) {
    console.error(err);
    showToast("⚠️ Failed to save. Please try again.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Save Customer`;
  }
}

function openEdit(id) {
  const c = customers.find((cust) => cust.id === id);
  if (!c) return;

  customerIdField.value = c.id;
  customerNameField.value = c.name || "";
  customerPhoneField.value = c.phone || "";
  customerCompanyField.value = c.company || "";
  customerStatusField.value = c.status || "Lead";
  customerNotesField.value = c.notes || "";

  openModal("Edit Customer");
}

function openDelete(id) {
  deleteTargetId = id;
  openDeleteModal();
}

async function confirmDelete() {
  if (!deleteTargetId) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Deleting...";

  try {
    await apiDelete(deleteTargetId);
    showToast("🗑️ Customer deleted.");
    closeDeleteModal();
    await loadCustomers();
  } catch (err) {
    console.error(err);
    showToast("⚠️ Failed to delete.");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Delete";
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
addCustomerBtn.addEventListener("click", () => openModal());
modalClose.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
customerForm.addEventListener("submit", saveCustomer);

cancelDeleteBtn.addEventListener("click", closeDeleteModal);
confirmDeleteBtn.addEventListener("click", confirmDelete);

// Close modals on overlay click
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
deleteOverlay.addEventListener("click", (e) => {
  if (e.target === deleteOverlay) closeDeleteModal();
});

// Close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeDeleteModal();
  }
});

// Search
searchInput.addEventListener("input", () => renderTable());

// Filter tabs
$$(".filter-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".filter-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.filter;
    renderTable();
  });
});

// ============================================================
// INIT
// ============================================================
loadCustomers();
