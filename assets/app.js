const KEY = "mdp_v1";

const seed = {
  users: [
    { id: "u1", name: "System Administrator", email: "admin@portal.local", password: "Admin123!", role: "ADMIN", status: "ACTIVE" },
    { id: "u2", name: "John Manager", email: "manager@portal.local", password: "Manager123!", role: "MANAGER", status: "ACTIVE" }
  ],
  spaces: [
    { id: "s1", name: "Operations", description: "Operational reports and documents", owner: "u2" },
    { id: "s2", name: "Finance", description: "Budgets, invoices and financial reports", owner: "u2" }
  ],
  docs: [
    {
      id: "d1",
      name: "Q4 KPI Summary.pdf",
      type: "application/pdf",
      spaceId: "s1",
      spaceName: "Operations",
      uploadedBy: "u2",
      status: "APPROVED",
      uploadedAt: "2026-09-01 10:17 AM",
      reviewedBy: "u1",
      reviewedAt: "2026-09-02 09:10 AM",
      reviewComment: "Approved for distribution.",
      note: "Quarterly performance report."
    },
    {
      id: "d2",
      name: "Budget Review.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      spaceId: "s2",
      spaceName: "Finance",
      uploadedBy: "u2",
      status: "PENDING",
      uploadedAt: "2026-09-08 12:31 PM",
      note: "Finance forecast update."
    }
  ],
  logs: [
    { id: "l1", user: "u2", action: "UPLOAD_DOCUMENT", target: "Q4 KPI Summary.pdf", at: "2026-09-01 10:17 AM" },
    { id: "l2", user: "u1", action: "APPROVE_DOCUMENT", target: "Q4 KPI Summary.pdf", at: "2026-09-02 09:10 AM" }
  ]
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return clone(seed);
    }
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : clone(seed.users),
      spaces: Array.isArray(parsed.spaces) ? parsed.spaces : clone(seed.spaces),
      docs: Array.isArray(parsed.docs) ? parsed.docs : clone(seed.docs),
      logs: Array.isArray(parsed.logs) ? parsed.logs : clone(seed.logs)
    };
  } catch (error) {
    localStorage.setItem(KEY, JSON.stringify(seed));
    return clone(seed);
  }
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

let db = load();
let session = null;
let view = "dashboard";

const app = document.getElementById("app");
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

const uid = (prefix) =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function current() {
  return db.users.find((user) => user.id === session) || null;
}

function log(action, target = "") {
  db.logs.unshift({
    id: uid("l"),
    user: session,
    action,
    target,
    at: new Date().toLocaleString()
  });
  db.logs = db.logs.slice(0, 300);
  save(db);
}

function render() {
  if (session) {
    renderApp();
  } else {
    renderLogin();
  }
}

function renderLogin() {
  app.innerHTML = `
    <div class="screen login">
      <div class="login-card">
        <div class="logo">MD</div>
        <h1>Manager Document Portal</h1>
        <p class="sub">Secure document spaces and approval workflow.</p>
        <div id="loginMsg"></div>
        <form id="loginForm">
          <div class="field">
            <label>Email</label>
            <input id="email" type="email" required placeholder="you@example.com" />
          </div>
          <div class="field">
            <label>Password</label>
            <input id="password" type="password" required placeholder="••••••••" />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Sign in</button>
        </form>
        <div class="demo">
          <b>Demo accounts</b><br />
          Admin: admin@portal.local / Admin123!<br />
          Manager: manager@portal.local / Manager123!
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById("loginForm");
  const loginMsg = document.getElementById("loginMsg");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    const user = db.users.find(
      (entry) => entry.email.toLowerCase() === email && entry.password === password
    );

    if (!user) {
      loginMsg.innerHTML = '<div class="notice error">Invalid email or password.</div>';
      return;
    }

    if (user.status !== "ACTIVE") {
      loginMsg.innerHTML = '<div class="notice error">This account is not active.</div>';
      return;
    }

    session = user.id;
    view = "dashboard";
    log("LOGIN", user.email);
    render();
  });
}

function renderApp() {
  const user = current();

  if (!user) {
    session = null;
    render();
    return;
  }

  const admin = user.role === "ADMIN";
  const nav = admin
    ? [
        ["dashboard", "Dashboard"],
        ["managers", "Managers"],
        ["approvals", "Approvals"],
        ["documents", "All Documents"],
        ["activity", "Activity"]
      ]
    : [
        ["dashboard", "Dashboard"],
        ["spaces", "Document Spaces"],
        ["documents", "My Documents"]
      ];

  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">▣ Manager Portal</div>
        <nav class="nav">
          ${nav
            .map(
              ([name, text]) => `
                <button class="${view === name ? "active" : ""}" data-view="${name}">
                  ${text}
                </button>
              `
            )
            .join("")}
        </nav>
        <button class="btn btn-secondary logout" id="logout">Log out</button>
      </aside>

      <main class="main">
        <div class="topbar">
          <div>
            <h2>${title(view)}</h2>
            <div class="muted">${admin ? "Administrator control board" : "Manager workspace"}</div>
          </div>
          <div class="user-chip">${esc(user.name)} · ${user.role}</div>
        </div>
        <section id="content"></section>
      </main>
    </div>
  `;

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      view = button.dataset.view;
      renderApp();
    });
  });

  document.getElementById("logout").addEventListener("click", () => {
    log("LOGOUT", user.email);
    session = null;
    render();
  });

  renderContent();
}

function title(viewName) {
  const titles = {
    dashboard: "Dashboard",
    spaces: "Document Spaces",
    documents: "Documents",
    managers: "Managers",
    approvals: "Approval Queue",
    activity: "Activity Log"
  };
  return titles[viewName] || "Dashboard";
}

function visibleDocuments() {
  const currentUser = current();
  if (!currentUser) return [];

  if (currentUser.role === "ADMIN") {
    return [...db.docs];
  }

  return db.docs.filter((document) => document.uploadedBy === currentUser.id);
}

function dashboard() {
  const currentUser = current();
  const docs = visibleDocuments();

  const pending = docs.filter((d) => d.status === "PENDING").length;
  const approved = docs.filter((d) => d.status === "APPROVED").length;
  const rejected = docs.filter((d) => d.status === "REJECTED").length;

  return `
    <div class="cards">
      <div class="card">
        <div class="muted">Total documents</div>
        <div class="metric">${docs.length}</div>
      </div>
      <div class="card">
        <div class="muted">Pending</div>
        <div class="metric">${pending}</div>
      </div>
      <div class="card">
        <div class="muted">Approved</div>
        <div class="metric">${approved}</div>
      </div>
      <div class="card">
        <div class="muted">Rejected</div>
        <div class="metric">${rejected}</div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <h3>Recent documents</h3>
        ${docs.slice(0, 6).map(docRow).join("") || '<div class="empty">No documents yet.</div>'}
      </div>

      <div class="card">
        <h3>${currentUser.role === "ADMIN" ? "Pending approvals" : "Your document spaces"}</h3>
        ${
          currentUser.role === "ADMIN"
            ? db.docs
                .filter((d) => d.status === "PENDING")
                .slice(0, 6)
                .map(docRow)
                .join("") || '<div class="empty">Approval queue is clear.</div>'
            : db.spaces
                .filter((space) => space.owner === currentUser.id)
                .map(
                  (space) => `
                    <div style="padding:12px 0;border-bottom:1px solid var(--line)">
                      <b>${esc(space.name)}</b>
                      <div class="muted">${esc(space.description)}</div>
                    </div>
                  `
                )
                .join("") || '<div class="empty">No spaces.</div>'
        }
      </div>
    </div>
  `;
}

function docRow(documentItem) {
  return `
    <div style="padding:11px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;">
      <div>
        <b>${esc(documentItem.name)}</b>
        <div class="muted">${esc(documentItem.spaceName)} · ${esc(documentItem.uploadedAt)}</div>
      </div>
      <span class="badge ${documentItem.status.toLowerCase()}">${documentItem.status}</span>
    </div>
  `;
}

function spaces() {
  const user = current();
  const userSpaces = db.spaces.filter((space) => space.owner === user.id);

  return `
    <div class="toolbar">
      <button class="btn btn-primary" id="newSpace">+ New document space</button>
    </div>
    <div class="space-grid">
      ${
        userSpaces.length
          ? userSpaces
              .map(
                (space) => `
                  <div class="card space-card">
                    <div class="space-icon">▱</div>
                    <h3>${esc(space.name)}</h3>
                    <p class="muted">${esc(space.description)}</p>
                    <div class="muted">${db.docs.filter((d) => d.spaceId === space.id).length} documents</div>
                  </div>
                `
              )
              .join("")
          : '<div class="card empty">Create your first document space.</div>'
      }
    </div>
  `;
}

function documents(list) {
  const currentUser = current();
  const rows = list.length
    ? list
        .map((documentItem) => {
          const uploader = db.users.find((user) => user.id === documentItem.uploadedBy);
          const showOpen = documentItem.data ? `<button class="btn btn-secondary" data-download="${documentItem.id}">Open</button>` : "";
          const adminActions =
            currentUser.role === "ADMIN" && documentItem.status === "PENDING"
              ? `
                  <button class="btn btn-success" data-approve="${documentItem.id}">Approve</button>
                  <button class="btn btn-danger" data-reject="${documentItem.id}">Reject</button>
                `
              : "";
          const deleteAction =
            currentUser.role === "ADMIN" || documentItem.uploadedBy === currentUser.id
              ? `<button class="btn btn-danger" data-delete="${documentItem.id}">Delete</button>`
              : "";

          return `
            <tr>
              <td>
                <b>${esc(documentItem.name)}</b>
                <div class="muted">${esc(documentItem.type || "file")}</div>
              </td>
              <td>${esc(documentItem.spaceName)}</td>
              <td>${esc(uploader?.name || "Unknown")}</td>
              <td><span class="badge ${documentItem.status.toLowerCase()}">${documentItem.status}</span></td>
              <td>${esc(documentItem.uploadedAt)}</td>
              <td>
                <div class="actions">
                  ${showOpen}
                  ${adminActions}
                  ${deleteAction}
                </div>
              </td>
            </tr>
          `;
        })
        .join("")
    : '<tr><td colspan="6" class="empty">No documents found.</td></tr>';

  return `
    <div class="toolbar">
      <input id="docSearch" placeholder="Search documents..." />
      <button class="btn btn-primary" id="uploadBtn">+ Upload document</button>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Space</th>
            <th>Uploaded by</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function managers() {
  const managersList = db.users.filter((user) => user.role === "MANAGER");

  return `
    <div class="toolbar">
      <button class="btn btn-primary" id="newManager">+ Create manager</button>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Spaces</th>
            <th>Documents</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${managersList
            .map((manager) => `
              <tr>
                <td><b>${esc(manager.name)}</b></td>
                <td>${esc(manager.email)}</td>
                <td>
                  <span class="badge ${manager.status === "ACTIVE" ? "approved" : "rejected"}">
                    ${manager.status}
                  </span>
                </td>
                <td>${db.spaces.filter((space) => space.owner === manager.id).length}</td>
                <td>${db.docs.filter((documentItem) => documentItem.uploadedBy === manager.id).length}</td>
                <td>
                  <div class="actions">
                    <button class="btn btn-secondary" data-toggle="${manager.id}">
                      ${manager.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                    <button class="btn btn-danger" data-remove-user="${manager.id}">Delete</button>
                  </div>
                </td>
              </tr>
            `)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function approvals() {
  const pending = db.docs.filter((documentItem) => documentItem.status === "PENDING");
  return `
    <div class="card">
      <h3>Documents awaiting approval</h3>
      <p class="muted">Review manager uploads before they become approved.</p>
    </div>
    <br />
    ${documents(pending)}
  `;
}

function activity() {
  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          ${
            db.logs.length
              ? db.logs
                  .map(
                    (logEntry) => `
                      <tr>
                        <td>${esc(logEntry.at)}</td>
                        <td>${esc(db.users.find((user) => user.id === logEntry.user)?.name || logEntry.user)}</td>
                        <td>${esc(logEntry.action)}</td>
                        <td>${esc(logEntry.target)}</td>
                      </tr>
                    `
                  )
                  .join("")
              : '<tr><td colspan="4" class="empty">No activity yet.</td></tr>'
          }
        </tbody>
      </table>
    </div>
  `;
}

function renderContent() {
  const content = document.getElementById("content");
  const currentUser = current();

  if (!content || !currentUser) return;

  if (view === "dashboard") {
    content.innerHTML = dashboard();
  } else if (view === "spaces") {
    content.innerHTML = spaces();
  } else if (view === "documents") {
    const list =
      currentUser.role === "ADMIN" ? db.docs : db.docs.filter((documentItem) => documentItem.uploadedBy === currentUser.id);
    content.innerHTML = documents(list);
  } else if (view === "managers") {
    content.innerHTML = managers();
  } else if (view === "approvals") {
    content.innerHTML = approvals();
  } else if (view === "activity") {
    content.innerHTML = activity();
  } else {
    content.innerHTML = dashboard();
  }

  bindContent();
}

function bindContent() {
  const currentUser = current();
  if (!currentUser) return;

  const newSpaceButton = document.getElementById("newSpace");
  if (newSpaceButton) {
    newSpaceButton.addEventListener("click", () => {
      modal(
        "Create document space",
        `
          <form id="spaceForm">
            <div class="field">
              <label>Name</label>
              <input id="sname" required />
            </div>
            <div class="field">
              <label>Description</label>
              <textarea id="sdesc" rows="3"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Create space</button>
          </form>
        `,
        () => {
          const name = document.getElementById("sname").value.trim();
          const description = document.getElementById("sdesc").value.trim();

          if (!name) return;

          db.spaces.push({
            id: uid("s"),
            name,
            description,
            owner: currentUser.id
          });

          save(db);
          log("CREATE_SPACE", name);
          renderContent();
        }
      );
    });
  }

  const uploadButton = document.getElementById("uploadBtn");
  if (uploadButton) {
    uploadButton.addEventListener("click", uploadModal);
  }

  const newManagerButton = document.getElementById("newManager");
  if (newManagerButton) {
    newManagerButton.addEventListener("click", managerModal);
  }

  document.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const manager = db.users.find((user) => user.id === button.dataset.toggle);
      if (!manager) return;

      manager.status = manager.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      save(db);
      log("CHANGE_MANAGER_STATUS", manager.email);
      renderContent();
    });
  });

  document.querySelectorAll("[data-remove-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.removeUser;
      const manager = db.users.find((user) => user.id === id);
      if (!manager) return;

      if (!confirm("Delete this manager and their document spaces?")) return;

      db.users = db.users.filter((user) => user.id !== id);
      db.spaces = db.spaces.filter((space) => space.owner !== id);
      db.docs = db.docs.filter((documentItem) => documentItem.uploadedBy !== id);

      save(db);
      log("DELETE_MANAGER", manager.email);
      renderContent();
    });
  });

  document.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", () => review(button.dataset.approve, "APPROVED"));
  });

  document.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", () => review(button.dataset.reject, "REJECTED"));
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.delete;
      const documentItem = db.docs.find((entry) => entry.id === id);
      if (!documentItem) return;

      if (!confirm("Delete this document?")) return;

      db.docs = db.docs.filter((entry) => entry.id !== id);
      save(db);
      log("DELETE_DOCUMENT", documentItem.name);
      renderContent();
    });
  });

  document.querySelectorAll("[data-download]").forEach((button) => {
    button.addEventListener("click", () => {
      const documentItem = db.docs.find((entry) => entry.id === button.dataset.download);
      if (!documentItem || !documentItem.data) return;

      const a = document.createElement("a");
      a.href = documentItem.data;
      a.download = documentItem.name;
      a.click();

      log("OPEN_DOCUMENT", documentItem.name);
    });
  });

  const docSearch = document.getElementById("docSearch");
  if (docSearch) {
    docSearch.addEventListener("input", (event) => {
      const term = event.target.value.trim().toLowerCase();
      const source = currentUser.role === "ADMIN" ? db.docs : db.docs.filter((documentItem) => documentItem.uploadedBy === currentUser.id);

      const filtered = term
        ? source.filter((documentItem) =>
            documentItem.name.toLowerCase().includes(term) ||
            documentItem.spaceName.toLowerCase().includes(term) ||
            documentItem.type.toLowerCase().includes(term)
          )
        : source;

      const content = document.getElementById("content");
      if (content) {
        content.innerHTML = documents(filtered);
        bindContent();
      }
    });
  }
}

function modal(titleText, body, onSubmit) {
  const wrapper = document.createElement("div");
  wrapper.className = "modal-backdrop";
  wrapper.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3>${titleText}</h3>
        <button type="button" class="close">×</button>
      </div>
      ${body}
    </div>
  `;

  document.body.appendChild(wrapper);

  const closeButton = wrapper.querySelector(".close");
  closeButton.addEventListener("click", () => wrapper.remove());

  const form = wrapper.querySelector("form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      onSubmit();
      wrapper.remove();
    });
  }
}

function managerModal() {
  modal(
    "Create manager",
    `
      <form id="mgrForm">
        <div class="field">
          <label>Full name</label>
          <input id="mname" required />
        </div>
        <div class="field">
          <label>Email</label>
          <input id="memail" type="email" required />
        </div>
        <div class="field">
          <label>Temporary password</label>
          <input id="mpass" required minlength="8" />
        </div>
        <button type="submit" class="btn btn-primary">Create manager</button>
      </form>
    `,
    () => {
      const name = document.getElementById("mname").value.trim();
      const email = document.getElementById("memail").value.trim();
      const password = document.getElementById("mpass").value;

      if (!name || !email || !password) return;

      if (db.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
        alert("Email already exists.");
        return;
      }

      db.users.push({
        id: uid("u"),
        name,
        email,
        password,
        role: "MANAGER",
        status: "ACTIVE"
      });

      save(db);
      log("CREATE_MANAGER", email);
      renderContent();
    }
  );
}

function uploadModal() {
  const spaces = db.spaces.filter((space) => space.owner === current().id);

  if (!spaces.length) {
    alert("Create a document space first.");
    view = "spaces";
    renderApp();
    return;
  }

  modal(
    "Upload document",
    `
      <form id="upForm">
        <div class="field">
          <label>Document space</label>
          <select id="spaceSelect">
            ${spaces.map((space) => `<option value="${space.id}">${esc(space.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>File</label>
          <input id="fileInput" type="file" required />
        </div>
        <div class="field">
          <label>Optional note</label>
          <textarea id="note" rows="3"></textarea>
        </div>
        <button type="submit" class="btn btn-primary">Upload for approval</button>
      </form>
    `,
    () => {
      const fileInput = document.getElementById("fileInput");
      const file = fileInput.files[0];
      const note = document.getElementById("note").value.trim();
      const selectedSpaceId = document.getElementById("spaceSelect").value;

      if (!file) {
        alert("Please select a file.");
        return;
      }

      const space = db.spaces.find((entry) => entry.id === selectedSpaceId);
      if (!space) return;

      const reader = new FileReader();
      reader.onload = () => {
        db.docs.unshift({
          id: uid("d"),
          name: file.name,
          type: file.type || "file",
          spaceId: space.id,
          spaceName: space.name,
          uploadedBy: current().id,
          status: "PENDING",
          uploadedAt: new Date().toLocaleString(),
          data: reader.result,
          note
        });

        save(db);
        log("UPLOAD_DOCUMENT", file.name);
        renderContent();
      };
      reader.readAsDataURL(file);
    }
  );
}

function review(id, status) {
  const documentItem = db.docs.find((entry) => entry.id === id);
  if (!documentItem) return;

  let comment = "";
  if (status === "APPROVED") {
    comment = prompt("Approval note (optional):", "") || "";
  } else {
    comment = prompt("Reason for rejection:", "");
    if (!comment) {
      alert("Please provide a rejection reason.");
      return;
    }
  }

  documentItem.status = status;
  documentItem.reviewComment = comment;
  documentItem.reviewedBy = current().id;
  documentItem.reviewedAt = new Date().toLocaleString();

  save(db);
  log(status === "APPROVED" ? "APPROVE_DOCUMENT" : "REJECT_DOCUMENT", documentItem.name);
  renderContent();
}

render();
