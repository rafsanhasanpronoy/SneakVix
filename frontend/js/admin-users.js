// admin-users.js — list users, change role (customer/admin), delete a user.
// Requires GET/PATCH/DELETE on /admin/users/ and /admin/users/<id>/.
let allUsers = [];

document.addEventListener("DOMContentLoaded", () => {
  loadUsers();
  document.getElementById("userSearch").addEventListener("input", (e) => {
    renderRows(filterUsers(e.target.value));
  });
});

function filterUsers(query) {
  const q = query.trim().toLowerCase();
  if (!q) return allUsers;
  return allUsers.filter(
    (u) => u.username.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
  );
}

async function loadUsers() {
  const el = document.getElementById("userRows");
  try {
    allUsers = await api.get("/admin/users/");
    document.getElementById("userCount").textContent = `${allUsers.length} registered users`;
    renderRows(allUsers);
  } catch {
    document.getElementById("userCount").textContent = "";
    el.innerHTML = `<tr><td colspan="5" class="empty-row">Could not load users \u2014 does <code>/admin/users/</code> exist on your API yet?</td></tr>`;
  }
}

function renderRows(users) {
  const el = document.getElementById("userRows");
  const me = currentUser();

  if (users.length === 0) {
    el.innerHTML = `<tr><td colspan="5" class="empty-row">No users match.</td></tr>`;
    return;
  }

  el.innerHTML = users
    .map((u) => {
      const isSelf = me && me.id === u.id;
      return `
    <tr>
      <td style="font-weight:500;">${u.username}${isSelf ? ' <span style="color:#bbb;font-size:11.5px;">(you)</span>' : ""}</td>
      <td style="color:#666;">${u.email || "—"}</td>
      <td>
        <select class="form-select role-select" data-id="${u.id}" style="width:auto;padding:6px 10px;font-size:12.5px;" ${isSelf ? "disabled" : ""}>
          <option value="customer" ${u.role === "customer" ? "selected" : ""}>Customer</option>
          <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </td>
      <td style="color:#aaa;font-size:13px;">${u.date_joined ? new Date(u.date_joined).toLocaleDateString() : "—"}</td>
      <td style="text-align:right;">
        <button class="btn-row-delete" data-id="${u.id}" data-name="${u.username}" ${isSelf ? "disabled title=\"You can't delete your own account\"" : ""}>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          Delete
        </button>
      </td>
    </tr>
  `;
    })
    .join("");

  el.querySelectorAll(".role-select").forEach((sel) => {
    sel.addEventListener("change", () => handleRoleChange(sel));
  });
  el.querySelectorAll(".btn-row-delete:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.id, btn.dataset.name));
  });
}

function showAlert(message, type) {
  document.getElementById("alertBox").innerHTML = `<div class="alert-${type}">${message}</div>`;
}

async function handleRoleChange(sel) {
  const id = sel.dataset.id;
  const newRole = sel.value;
  sel.disabled = true;
  try {
    await api.patch(`/admin/users/${id}/`, { role: newRole });
    showAlert(`Role updated.`, "success");
    const u = allUsers.find((x) => String(x.id) === String(id));
    if (u) u.role = newRole;
  } catch (err) {
    showAlert(err.data?.error || "Could not update role.", "error");
    loadUsers(); // revert the dropdown to the real value
  } finally {
    sel.disabled = false;
  }
}

async function handleDelete(id, name) {
  if (!confirm(`Delete user "${name}"? This can't be undone.`)) return;
  try {
    await api.del(`/admin/users/${id}/`);
    showAlert("User deleted.", "success");
    loadUsers();
  } catch (err) {
    showAlert(err.data?.error || "Could not delete user.", "error");
  }
}