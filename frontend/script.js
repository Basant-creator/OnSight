// Global configuration
const API_BASE = "http://localhost:5000";

/**
 * Universal fetch wrapper for OnSight API.
 * CRITICAL: Automatically injects credentials: "include" to transmit the httpOnly Cookie to backend!
 */
async function apiFetch(endpoint, options = {}) {
    const config = {
        ...options,
        credentials: "include", // This is the engine ensuring cookies jump via CORS
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (err) {
        console.error(`[Network Flow Failure]:`, err);
        return { ok: false, status: 500, data: { error: "Network unreachable. Is the backend running?" } };
    }
}

// ------------------------------------------------------------------
// GATEWAY LOGIC (login.html)
// ------------------------------------------------------------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const errorBox = document.getElementById("auth-error-box");
        
        // Lock UI
        const btn = e.target.querySelector("button");
        btn.innerHTML = `<span class="material-symbols-outlined material-fill" style="animation: spin 1s linear infinite;">sync</span> Authenticating...`;

        const { ok, data } = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        if (ok) {
            // Store non-sensitive user metadata so the UI recognizes who is logged in
            localStorage.setItem("onsight_user", JSON.stringify(data.user));
            
            // Intelligent Routing Logic
            const role = data.user.role;
            if (role === "head_admin" || role === "sub_admin") {
                window.location.href = "admin_dashboard.html";
            } else if (role === "teacher") {
                window.location.href = "teacher_dashboard.html";
            } else {
                window.location.href = "student_dashboard.html";
            }
        } else {
            // Restore UI and display error
            btn.innerHTML = `Authenticate <span class="material-symbols-outlined">login</span>`;
            errorBox.style.display = "block";
            errorBox.textContent = data.error || "Authentication failed.";
        }
    });
}

// ------------------------------------------------------------------
// PROVISIONING LOGIC (admin_dashboard.html)
// ------------------------------------------------------------------
const provisionForm = document.getElementById("provisionForm");
if (provisionForm) {
    provisionForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const role = document.getElementById("newUserRole").value;
        const name = document.getElementById("newUserName").value;
        const email = document.getElementById("newUserEmail").value;
        const password = document.getElementById("newUserPass").value;
        
        const msgBox = document.getElementById("provision-msg-box");
        const btn = e.target.querySelector("button");

        // Lock UI
        btn.innerHTML = `<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span> Injecting...`;

        const { ok, status, data } = await apiFetch("/api/admin/create-user", {
            method: "POST",
            body: JSON.stringify({ role, name, email, password })
        });

        // Restore UI Button
        btn.innerHTML = `Inject Entity into Database <span class="material-symbols-outlined material-fill">add_circle</span>`;
        msgBox.style.display = "block";

        if (ok) {
            msgBox.style.backgroundColor = "rgba(220, 184, 255, 0.1)"; // Primary Green/Purple success
            msgBox.style.borderColor = "var(--primary)";
            msgBox.style.color = "var(--primary)";
            msgBox.textContent = `SUCCESS: Securely spawned ${role.toUpperCase()} network object code.`;
            e.target.reset(); // Clear form
        } else {
            msgBox.style.backgroundColor = "rgba(236, 124, 138, 0.1)"; // Error red
            msgBox.style.borderColor = "var(--error)";
            msgBox.style.color = "var(--error)";
            
            // Special handling for the 403 Sub-Admin trying to make admins
            if (status === 403) {
                msgBox.textContent = `CRITICAL 403: ` + (data.error || "Priority override failure.");
            } else {
                msgBox.textContent = data.error || "Provisioning failure.";
            }
        }
    });
}

// ------------------------------------------------------------------
// GLOBAL TERMINATION LOGIC (Logout)
// ------------------------------------------------------------------
async function handleLogout(e) {
    if (e) e.preventDefault();
    
    // Attempt backend session destruction
    await apiFetch("/auth/logout", { method: "POST" });
    
    // Purge local cache
    localStorage.removeItem("onsight_user");
    
    // Sever tie
    window.location.href = "login.html";
}
