// Global configuration
const API_BASE = "http://localhost:5000";

// ------------------------------------------------------------------
// THEME TOGGLE LOGIC
// ------------------------------------------------------------------
const initTheme = () => {
    const savedTheme = localStorage.getItem("onsight_theme");
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
        document.documentElement.setAttribute("data-theme", "light");
    }
};

const toggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("onsight_theme", next);
};

initTheme();

document.addEventListener("DOMContentLoaded", () => {
    const toggles = document.querySelectorAll(".theme-toggle");
    toggles.forEach(btn => btn.addEventListener("click", toggleTheme));
    
    // Typing Animation logic
    const typingElement = document.getElementById("hero-typing-text");
    if (typingElement) {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        
        async function runTyping() {
            const firstStr = "OnSight.";
            // Type "OnSight."
            for (let i = 0; i <= firstStr.length; i++) {
                typingElement.textContent = firstStr.substring(0, i);
                await sleep(80);
            }
            
            // Wait to be read
            await sleep(1200);
            
            // Backspace it
            for (let i = firstStr.length; i >= 0; i--) {
                typingElement.textContent = firstStr.substring(0, i);
                await sleep(50);
            }
            
            // Pause before next text
            await sleep(600);
            
            // Type "Redefining the "
            const finalStrStart = "Redefining the ";
            for (let i = 0; i <= finalStrStart.length; i++) {
                typingElement.textContent = finalStrStart.substring(0, i);
                await sleep(60);
            }
            
            // Inject animated colored span for "Exam Experience"
            const span = document.createElement("span");
            span.style.color = "var(--primary)";
            typingElement.appendChild(span);
            
            const highlightStr = "Exam Experience";
            for (let i = 0; i <= highlightStr.length; i++) {
                span.textContent = highlightStr.substring(0, i);
                await sleep(60);
            }
            
            // Add the final '.' dot outside of the span
            const dotNode = document.createTextNode("");
            typingElement.appendChild(dotNode);
            const finalStrEnd = ".";
            for (let i = 0; i <= finalStrEnd.length; i++) {
                dotNode.nodeValue = finalStrEnd.substring(0, i);
                await sleep(60);
            }
        }
        
        runTyping();
    }
});

/**
 * Universal fetch wrapper for OnSight API.
 * CRITICAL: Automatically injects credentials: "include" to transmit the httpOnly Cookie to backend!
 */
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("onsight_token");
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        credentials: "include", // This is the engine ensuring cookies jump via CORS
        headers
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
        const roleSelect = document.getElementById("role");
        const role = roleSelect ? roleSelect.value : null;
        const errorBox = document.getElementById("auth-error-box");
        
        // Lock UI
        const btn = e.target.querySelector("button");
        btn.innerHTML = `<span class="material-symbols-outlined material-fill" style="animation: spin 1s linear infinite;">sync</span> Authenticating...`;

        const { ok, data } = await apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password, role })
        });

        if (ok) {
            // Store non-sensitive user metadata so the UI recognizes who is logged in
            localStorage.setItem("onsight_user", JSON.stringify(data.user));
            if (data.token) localStorage.setItem("onsight_token", data.token);
            
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
    localStorage.removeItem("onsight_token");
    
    // Sever tie
    window.location.href = "index.html#login-section";
}

// ------------------------------------------------------------------
// STUDENT DASHBOARD TABS
// ------------------------------------------------------------------
const navDashboard = document.getElementById("nav-dashboard");
const navExams = document.getElementById("nav-exams");
const viewDashboard = document.getElementById("view-dashboard");
const viewExams = document.getElementById("view-exams");

if (navDashboard && navExams && viewDashboard && viewExams) {
    navDashboard.addEventListener("click", (e) => {
        e.preventDefault();
        navDashboard.classList.add("active");
        navExams.classList.remove("active");
        viewDashboard.style.display = "block";
        viewExams.style.display = "none";
    });

    navExams.addEventListener("click", (e) => {
        e.preventDefault();
        navExams.classList.add("active");
        navDashboard.classList.remove("active");
        viewExams.style.display = "block";
        viewDashboard.style.display = "none";
    });
}

// ------------------------------------------------------------------
// TEACHER DASHBOARD LOGIC
// ------------------------------------------------------------------
const navTeacherDashboard = document.getElementById("nav-dashboard");
const navTeacherExams = document.getElementById("nav-exams");
const viewTeacherDashboard = document.getElementById("view-dashboard");
const viewTeacherExams = document.getElementById("view-exams");

let currentParsedQuestions = [];

if (navTeacherDashboard && navTeacherExams && viewTeacherDashboard && viewTeacherExams) {
    navTeacherDashboard.addEventListener("click", (e) => {
        e.preventDefault();
        navTeacherDashboard.classList.add("active");
        navTeacherExams.classList.remove("active");
        viewTeacherDashboard.style.display = "block";
        viewTeacherExams.style.display = "none";
        loadStudentAttempts();
    });

    navTeacherExams.addEventListener("click", (e) => {
        e.preventDefault();
        navTeacherExams.classList.add("active");
        navTeacherDashboard.classList.remove("active");
        viewTeacherExams.style.display = "block";
        viewTeacherDashboard.style.display = "none";
        loadTeacherExams();
    });

    // Load initial data based on active tab
    if(navTeacherDashboard.classList.contains("active")) {
        loadStudentAttempts();
    } else {
        loadTeacherExams();
    }
}

async function loadStudentAttempts() {
    const container = document.getElementById("attempts-list-container");
    if (!container) return;

    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading attempts...</div>`;

    const { ok, data } = await apiFetch("/api/teacher/exams/attempts", { method: "GET" });
    
    if (ok && data.attempts) {
        if(data.attempts.length === 0) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No student attempts found.</div>`;
            return;
        }

        container.innerHTML = data.attempts.map(att => `
            <div class="table-row">
                <div class="flex-col">
                    <p class="text-main">${att.studentId ? (att.studentId.username || att.studentId.email) : 'Unknown Student'}</p>
                    <p class="text-sub">${new Date(att.attemptDate).toLocaleDateString()}</p>
                </div>
                <div>
                    <span class="badge secondary">${att.examId ? att.examId.title : 'Deleted Exam'}</span>
                </div>
                <div>
                    <span style="font-weight: bold; color: var(--primary);">${att.score} / ${att.totalQuestions || '-'}</span>
                </div>
                <div>
                    <span class="badge ${att.status === 'published' ? 'primary' : 'secondary'}">
                        ${att.status.toUpperCase()}
                    </span>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--error);">Error loading attempts.</div>`;
    }
}

async function loadTeacherExams() {
    const container = document.getElementById("exams-list-container");
    if (!container) return;

    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading exams...</div>`;

    const { ok, data } = await apiFetch("/api/teacher/exams", { method: "GET" });
    
    if (ok && data.exams) {
        if(data.exams.length === 0) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No exams created yet.</div>`;
            return;
        }

        container.innerHTML = data.exams.map(exam => `
            <div class="table-row">
                <div class="flex-col">
                    <p class="text-main">${exam.title}</p>
                    <p class="text-sub">${exam.questions.length} Questions</p>
                </div>
                <div>
                    ${new Date(exam.createdAt).toLocaleDateString()}
                </div>
                <div>
                    <span class="badge ${exam.isPublished ? 'primary' : 'secondary'}">${exam.isPublished ? 'PUBLISHED' : 'DRAFT'}</span>
                </div>
                <div class="actions-flex">
                    <button onclick="promptRenameExam('${exam._id}', '${exam.title.replace(/'/g, "\\'")}')" title="Rename Exam"><span class="material-symbols-outlined">edit</span></button>
                    ${!exam.isPublished ? `<button onclick="publishExam('${exam._id}')" title="Publish Results"><span class="material-symbols-outlined">campaign</span></button>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--error);">Error loading exams.</div>`;
    }
}

async function publishExam(examId) {
    if(!confirm("Are you sure you want to publish the results for this exam?")) return;
    
    const { ok, data } = await apiFetch(`/api/teacher/exams/${examId}/publish-results`, { method: "POST" });
    if(ok) {
        alert("Results published!");
        loadTeacherExams(); // reload
    } else {
        alert(data.error || "Failed to publish results.");
    }
}

async function promptRenameExam(examId, currentTitle) {
    const newTitle = prompt("Enter new title for the exam:", currentTitle);
    if (!newTitle || newTitle.trim() === "" || newTitle === currentTitle) return;

    const { ok, data } = await apiFetch(`/api/teacher/exams/${examId}/rename`, { 
        method: "PUT",
        body: JSON.stringify({ title: newTitle.trim() })
    });
    
    if (ok) {
        alert("Exam renamed successfully!");
        loadTeacherExams(); // reload
    } else {
        alert(data.error || "Failed to rename exam.");
    }
}

// Upload PDF Logic
const uploadPdfForm = document.getElementById("uploadPdfForm");
if (uploadPdfForm) {
    uploadPdfForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById("examPdfFile");
        const statusBox = document.getElementById("upload-status");
        
        if (fileInput.files.length === 0) return;
        
        const file = fileInput.files[0];
        if (file.type !== "application/pdf") {
            statusBox.style.display = "block";
            statusBox.style.color = "var(--error)";
            statusBox.textContent = "Error: Only PDF files are allowed.";
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            statusBox.style.display = "block";
            statusBox.style.color = "var(--error)";
            statusBox.textContent = "Error: File size cannot exceed 5MB.";
            return;
        }

        statusBox.style.display = "block";
        statusBox.style.color = "var(--primary)";
        statusBox.textContent = "Parsing PDF... Contacting AI system...";
        
        const formData = new FormData();
        formData.append("pdf", file);
        
        try {
            const token = localStorage.getItem("onsight_token");
            const headers = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            // Using a raw fetch because apiFetch assumes JSON body right now
            const fetchConfig = {
                method: "POST",
                body: formData,
                credentials: "include",
                headers
            };
            
            const response = await fetch(API_BASE + "/api/teacher/exams/upload", fetchConfig);
            const data = await response.json();
            
            if (response.ok) {
                statusBox.textContent = "Extraction successful! Please review below.";
                currentParsedQuestions = data.questions;
                renderReviewPane();
            } else {
                statusBox.style.color = "var(--error)";
                statusBox.textContent = data.error || "Failed to parse PDF.";
            }
        } catch (err) {
            statusBox.style.color = "var(--error)";
            statusBox.textContent = "Network error during upload.";
        }
    });
}

function renderReviewPane() {
    const reviewPane = document.getElementById("review-pane");
    const questionsContainer = document.getElementById("extracted-questions-container");
    
    reviewPane.style.display = "block";
    questionsContainer.innerHTML = "";
    
    currentParsedQuestions.forEach((q, index) => {
        questionsContainer.innerHTML += `
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                <p><strong>Q${index + 1}:</strong> ${q.questionText}</p>
                <ul style="list-style-type: none; padding-left: 1rem;">
                    ${q.options.map(opt => `<li>- ${opt}</li>`).join('')}
                </ul>
                <p style="color: var(--primary);"><strong>Answer:</strong> ${q.correctAnswer}</p>
                ${q.explanation ? `<p style="font-size: 0.9em; color: var(--text-muted);">${q.explanation}</p>` : ''}
            </div>
        `;
    });
}

const saveExamBtn = document.getElementById("saveExamBtn");
if (saveExamBtn) {
    saveExamBtn.addEventListener("click", async () => {
        const title = document.getElementById("newExamTitle").value;
        const description = document.getElementById("newExamDesc").value;
        
        if(!title) {
            alert("Title is required!");
            return;
        }
        
        saveExamBtn.textContent = "Saving...";
        saveExamBtn.disabled = true;
        
        const { ok, data } = await apiFetch("/api/teacher/exams", {
            method: "POST",
            body: JSON.stringify({
                title,
                description,
                questions: currentParsedQuestions
            })
        });
        
        saveExamBtn.textContent = "Save Exam";
        saveExamBtn.disabled = false;
        
        if (ok) {
            alert("Exam saved successfully!");
            document.getElementById("uploadPdfForm").reset();
            document.getElementById("review-pane").style.display = "none";
            document.getElementById("upload-status").style.display = "none";
            document.getElementById("newExamTitle").value = "";
            document.getElementById("newExamDesc").value = "";
            currentParsedQuestions = [];
            loadTeacherExams();
        } else {
            alert(data.error || "Failed to save exam.");
        }
    });
}

const cancelExamBtn = document.getElementById("cancelExamBtn");
if (cancelExamBtn) {
    cancelExamBtn.addEventListener("click", () => {
        document.getElementById("review-pane").style.display = "none";
        document.getElementById("uploadPdfForm").reset();
        document.getElementById("upload-status").style.display = "none";
        currentParsedQuestions = [];
    });
}
