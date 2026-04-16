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
// LOGIN DROPDOWN LOGIC
// ------------------------------------------------------------------
const loginDropdownBtn = document.getElementById("login-dropdown-btn");
const loginDropdown = document.getElementById("login-dropdown");

if (loginDropdownBtn && loginDropdown) {
    loginDropdownBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        loginDropdown.style.display = loginDropdown.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("click", (e) => {
        if (!loginDropdown.contains(e.target) && e.target !== loginDropdownBtn) {
            loginDropdown.style.display = "none";
        }
    });
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
        loadStudentUpcomingExams();
    });

    navExams.addEventListener("click", (e) => {
        e.preventDefault();
        navExams.classList.add("active");
        navDashboard.classList.remove("active");
        viewExams.style.display = "block";
        viewDashboard.style.display = "none";
    });
    
    // Load student data initially
    loadStudentUpcomingExams();
}

async function loadStudentUpcomingExams() {
    const container = document.getElementById("upcoming-exams-container");
    if (!container) return;

    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading upcoming exams...</div>`;

    const { ok, data } = await apiFetch("/api/student/exams", { method: "GET" });
    
    if (ok && data.exams) {
        if(data.exams.length === 0) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No upcoming exams scheduled. Enjoy your free time!</div>`;
            return;
        }

        container.innerHTML = data.exams.map(exam => {
            const scheduledAt = new Date(exam.scheduledAt);
            const now = new Date();
            const diffMs = scheduledAt - now;
            const durationMins = Number(exam.durationMinutes) || 60;
            
            let countdownLabel = "";
            let canStart = false;
            const startWindowMs = 10 * 60 * 1000; // 10 minutes before start
            
            if (diffMs <= startWindowMs) {
                countdownLabel = "Available Now!";
                canStart = true;
            } else {
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                
                if (diffDays > 0) {
                    countdownLabel = `Starts in ${diffDays} day(s)`;
                } else if (diffHours > 0) {
                    countdownLabel = `Starts in ${diffHours} hour(s)`;
                } else {
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    countdownLabel = `Starts in ${diffMins} min(s)`;
                }
            }
            
            const btnClass = canStart ? "primary" : "secondary";
            const btnText = canStart ? "Start Exam" : "View Details";
            const btnIcon = canStart ? "rocket_launch" : "visibility";
            
            return `
            <div class="card ${canStart ? 'highlight' : ''}">
                <div class="card-header">
                    <div class="card-icon ${canStart ? 'primary' : 'secondary'}">
                        <span class="material-symbols-outlined material-fill">event</span>
                    </div>
                    <span class="badge secondary">${durationMins} Mins</span>
                </div>
                <h3 class="card-title">${exam.title}</h3>
                <p class="card-desc">Scheduled for: ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString()}</p>
                <p style="font-size: 0.85em; font-weight: bold; color: var(--primary); margin-bottom: 1rem;">${countdownLabel}</p>
                <button class="btn-card ${btnClass}" ${!canStart ? 'onclick="alert(\'Exam starts soon!\')"' : `onclick="startExam('${exam._id}')"`}>
                    ${btnText}
                    <span class="material-symbols-outlined">${btnIcon}</span>
                </button>
            </div>
            `;
        }).join('');
    } else {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--error);">Error loading exams.</div>`;
    }
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
                        ${(att.status || 'attempted').toUpperCase()}
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

        container.innerHTML = data.exams.map(exam => {
            let statusBadgeClass = exam.status === 'scheduled' ? 'primary' : 'secondary';
            let statusText = exam.status ? exam.status.toUpperCase() : (exam.isPublished ? 'PUBLISHED' : 'DRAFT');
            
            let scheduleUI = '';
            if (exam.status !== 'scheduled' && exam.status !== 'closed') {
                scheduleUI = `
                <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                        <input type="date" id="date-${exam._id}" style="padding:0.35rem; background:var(--surface); color:var(--on-surface); border:1px solid var(--surface-border); border-radius:0.375rem;" />
                        <input type="time" id="time-${exam._id}" style="padding:0.35rem; background:var(--surface); color:var(--on-surface); border:1px solid var(--surface-border); border-radius:0.375rem;" />
                        <input type="number" min="15" max="480" step="5" value="${exam.durationMinutes || 60}" id="duration-${exam._id}" style="width:84px; padding:0.35rem; background:var(--surface); color:var(--on-surface); border:1px solid var(--surface-border); border-radius:0.375rem;" title="Duration (minutes)" />
                        <button class="btn-primary" style="width:auto; padding:0.35rem 0.65rem; font-size:0.8rem;" onclick="scheduleExam('${exam._id}')">Schedule Exam</button>
                    </div>
                    <div class="schedule-calendar" id="calendar-${exam._id}"></div>
                    <div id="schedule-msg-${exam._id}" style="font-size:0.8rem; color:var(--on-surface-variant);"></div>
                </div>`;
            } else if (exam.status === 'scheduled') {
                scheduleUI = `<div style="margin-top: 0.5rem;"><span style="font-size:0.9em; color:var(--primary);">Scheduled: ${new Date(exam.scheduledAt).toLocaleString()}</span></div>`;
            }

            return `
            <div class="table-row" style="flex-wrap: wrap;">
                <div class="flex-col" style="flex:1; min-width: 250px;">
                    <p class="text-main">${exam.title}</p>
                    <p class="text-sub">${exam.questions ? exam.questions.length : 0} Questions</p>
                    ${scheduleUI}
                </div>
                <div>
                    ${new Date(exam.createdAt).toLocaleDateString()}
                </div>
                <div>
                    <span class="badge ${statusBadgeClass}">${statusText}</span>
                </div>
                <div class="actions-flex">
                    <button onclick="promptRenameExam('${exam._id}', '${exam.title.replace(/'/g, "\\'")}')" title="Rename Exam"><span class="material-symbols-outlined">edit</span></button>
                    <button onclick="openExamReview('${exam._id}')" title="Review Exam"><span class="material-symbols-outlined">reviews</span></button>
                    ${!exam.isPublished ? `<button onclick="publishExam('${exam._id}')" title="Publish Results"><span class="material-symbols-outlined">campaign</span></button>` : ''}
                </div>
            </div>
            `;
        }).join('');

        data.exams.forEach((exam) => {
            if (exam.status !== "scheduled" && exam.status !== "closed") {
                renderMiniCalendar(exam._id);
            }
        });
    } else {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--error);">Error loading exams.</div>`;
    }
}

function renderMiniCalendar(examId) {
    const calendarHost = document.getElementById(`calendar-${examId}`);
    const dateInput = document.getElementById(`date-${examId}`);
    if (!calendarHost || !dateInput) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayDateStr = now.toISOString().slice(0, 10);

    const weekday = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    let html = `<div style="display:grid; grid-template-columns:repeat(7, minmax(24px, 1fr)); gap:4px; margin-top:2px;">`;
    html += weekday.map((d) => `<div style="font-size:0.7rem; text-align:center; color:var(--on-surface-variant);">${d}</div>`).join("");
    for (let i = 0; i < firstDay; i += 1) {
        html += `<div></div>`;
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateObj = new Date(currentYear, currentMonth, day);
        const dateStr = dateObj.toISOString().slice(0, 10);
        const disabled = dateStr < todayDateStr;
        html += `<button type="button" data-date="${dateStr}" ${disabled ? "disabled" : ""} style="padding:4px; border:1px solid var(--surface-border); border-radius:6px; font-size:0.72rem; color:${disabled ? "var(--on-surface-variant)" : "var(--on-surface)"}; background:${disabled ? "var(--surface-container)" : "var(--surface)"};">${day}</button>`;
    }
    html += `</div>`;
    calendarHost.innerHTML = html;

    calendarHost.querySelectorAll("button[data-date]").forEach((btn) => {
        btn.addEventListener("click", () => {
            dateInput.value = btn.dataset.date || "";
            calendarHost.querySelectorAll("button[data-date]").forEach((b) => {
                b.style.borderColor = "var(--surface-border)";
                b.style.background = "var(--surface)";
            });
            btn.style.borderColor = "var(--primary)";
            btn.style.background = "var(--primary-container)";
        });
    });
}

async function scheduleExam(examId) {
    const dateField = document.getElementById(`date-${examId}`);
    const timeField = document.getElementById(`time-${examId}`);
    const durationField = document.getElementById(`duration-${examId}`);
    const msgBox = document.getElementById(`schedule-msg-${examId}`);
    const dateInput = dateField ? dateField.value : "";
    const timeInput = timeField ? timeField.value : "";
    
    if (!dateInput || !timeInput) {
        if (msgBox) {
            msgBox.style.color = "var(--error)";
            msgBox.textContent = "Please select both date and time.";
        }
        return;
    }
    
    const scheduledAt = new Date(`${dateInput}T${timeInput}`);
    const durationMinutes = durationField ? Number(durationField.value) : 60;
    
    if (scheduledAt <= new Date()) {
        if (msgBox) {
            msgBox.style.color = "var(--error)";
            msgBox.textContent = "Schedule date must be in the future.";
        }
        return;
    }
    
    const { ok, data } = await apiFetch(`/api/teacher/exams/${examId}/schedule`, {
        method: "PATCH",
        body: JSON.stringify({ scheduledAt: scheduledAt.toISOString(), durationMinutes })
    });
    
    if (ok) {
        if (msgBox) {
            msgBox.style.color = "var(--primary)";
            msgBox.textContent = `Scheduled for ${scheduledAt.toLocaleString()}.`;
        }
        loadTeacherExams();
        loadStudentUpcomingExams();
    } else {
        if (msgBox) {
            msgBox.style.color = "var(--error)";
            msgBox.textContent = data.error || "Failed to schedule exam.";
        }
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

// ------------------------------------------------------------------
// STUDENT EXAM ATTEMPT FLOW
// ------------------------------------------------------------------

let currentAttemptData = null;
let currentAnswers = [];

// Global function to start an exam (called from HTML)
window.startExam = async function(examId) {
    const container = document.getElementById("upcoming-exams-container");
    if (container) {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Starting exam...</div>`;
    }

    const { ok, data } = await apiFetch(`/api/student/exams/${examId}/attempt`, { method: "GET" });

    if (ok) {
        currentAttemptData = data;
        currentAnswers = data.questions.map(q => ({ questionIndex: q.questionIndex, selectedAnswer: null }));
        renderExamInterface(data);
    } else {
        alert(data.error || "Failed to start exam.");
        loadStudentUpcomingExams();
    }
};

function renderExamInterface(data) {
    const container = document.getElementById("view-dashboard");
    if (!container) return;

    const { exam, questions, attemptId } = data;
    const endTime = new Date(new Date().getTime() + exam.durationMinutes * 60 * 1000);

    let questionsHtml = questions.map((q, idx) => `
        <div class="exam-question" style="margin-bottom: 2rem; padding: 1.5rem; background: var(--surface); border: 1px solid var(--surface-border); border-radius: 0.75rem;">
            <h4 style="margin-bottom: 1rem; color: var(--on-surface);">Q${idx + 1}. ${escapeHtml(q.questionText)}</h4>
            <div class="options" style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${q.options.map((opt, optIdx) => `
                    <label class="option-label" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: var(--surface-container); border: 2px solid var(--surface-border); border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;">
                        <input type="radio" name="question-${q.questionIndex}" value="${escapeHtml(opt)}" onchange="updateAnswer(${q.questionIndex}, '${escapeHtml(opt)}')" style="width: 1.25rem; height: 1.25rem; accent-color: var(--primary);">
                        <span style="color: var(--on-surface);">${escapeHtml(opt)}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="exam-container" style="max-width: 800px; margin: 0 auto; padding: 1rem;">
            <div class="exam-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1rem; background: var(--primary-container); border-radius: 0.75rem;">
                <div>
                    <h2 style="color: var(--on-surface);">${escapeHtml(exam.title)}</h2>
                    <p style="color: var(--on-surface-variant);">${exam.totalQuestions} Questions | ${exam.durationMinutes} Minutes</p>
                </div>
                <div class="exam-timer" style="font-size: 1.5rem; font-weight: bold; color: var(--primary);" id="exam-timer">
                    ${exam.durationMinutes}:00
                </div>
            </div>
            <form id="exam-form" onsubmit="event.preventDefault(); submitExam('${exam._id}');">
                ${questionsHtml}
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button type="submit" class="btn-card primary" style="flex: 1;">
                        Submit Exam
                        <span class="material-symbols-outlined">check_circle</span>
                    </button>
                    <button type="button" class="btn-card secondary" onclick="cancelExam()" style="flex: 1;">
                        Cancel
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    // Start countdown timer
    startExamTimer(endTime);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global function to update answer selection
window.updateAnswer = function(questionIndex, selectedAnswer) {
    const answer = currentAnswers.find(a => a.questionIndex === questionIndex);
    if (answer) {
        answer.selectedAnswer = selectedAnswer;
    }
};

function startExamTimer(endTime) {
    const timerEl = document.getElementById("exam-timer");
    if (!timerEl) return;

    const timerInterval = setInterval(() => {
        const now = new Date();
        const diff = endTime - now;

        if (diff <= 0) {
            clearInterval(timerInterval);
            timerEl.textContent = "00:00";
            alert("Time's up! Your exam will be submitted automatically.");
            if (currentAttemptData) {
                submitExam(currentAttemptData.exam._id);
            }
            return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Warning color when less than 5 minutes
        if (minutes < 5) {
            timerEl.style.color = "var(--error)";
        }
    }, 1000);

    // Store interval ID to clear it on submit/cancel
    window.currentExamTimer = timerInterval;
}

// Global function to submit exam
window.submitExam = async function(examId) {
    // Validate all questions are answered
    const unanswered = currentAnswers.filter(a => !a.selectedAnswer);
    if (unanswered.length > 0) {
        if (!confirm(`You have ${unanswered.length} unanswered question(s). Are you sure you want to submit?`)) {
            return;
        }
    }

    if (window.currentExamTimer) {
        clearInterval(window.currentExamTimer);
    }

    const container = document.querySelector('.exam-container');
    if (container) {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Submitting your exam...</div>`;
    }

    const { ok, data } = await apiFetch(`/api/student/exams/${examId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: currentAnswers })
    });

    if (ok) {
        renderExamResults(data.attempt);
    } else {
        alert(data.error || "Failed to submit exam.");
        returnToDashboard();
    }
};

// Global function to cancel exam
window.cancelExam = function() {
    if (!confirm("Are you sure you want to cancel? Your progress will not be saved.")) {
        return;
    }
    if (window.currentExamTimer) {
        clearInterval(window.currentExamTimer);
    }
    currentAttemptData = null;
    currentAnswers = [];
    returnToDashboard();
};

function returnToDashboard() {
    const container = document.getElementById("view-dashboard");
    if (container) {
        // Reload the dashboard content
        location.reload();
    }
}

function renderExamResults(attempt) {
    const container = document.getElementById("view-dashboard");
    if (!container) return;

    const isPublished = attempt.status === "published";
    const scoreDisplay = isPublished
        ? `<div style="font-size: 3rem; font-weight: bold; color: var(--primary);">${attempt.score} / ${attempt.totalQuestions}</div>`
        : `<div style="font-size: 1.25rem; color: var(--text-muted);">Results not yet published</div>`;

    const percentage = isPublished && attempt.totalQuestions > 0
        ? Math.round((attempt.score / attempt.totalQuestions) * 100)
        : null;

    container.innerHTML = `
        <div class="exam-results" style="max-width: 600px; margin: 0 auto; padding: 2rem; text-align: center;">
            <div style="margin-bottom: 2rem;">
                <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--primary);">${isPublished ? 'check_circle' : 'pending'}</span>
            </div>
            <h2 style="margin-bottom: 1rem; color: var(--on-surface);">Exam Submitted!</h2>
            <p style="color: var(--on-surface-variant); margin-bottom: 2rem;">Your answers have been recorded.</p>
            <div style="background: var(--surface); border: 1px solid var(--surface-border); border-radius: 1rem; padding: 2rem; margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem; color: var(--on-surface);">Your Score</h3>
                ${scoreDisplay}
                ${percentage !== null ? `<p style="margin-top: 0.5rem; color: var(--on-surface-variant);">${percentage}% Correct</p>` : ''}
                <span class="badge ${isPublished ? 'primary' : 'secondary'}" style="margin-top: 1rem; display: inline-block;">
                    ${attempt.status.toUpperCase()}
                </span>
            </div>
            <button class="btn-card primary" onclick="returnToDashboard()">
                Return to Dashboard
                <span class="material-symbols-outlined">home</span>
            </button>
        </div>
    `;
}

// Load student attempts for the Exams tab
async function loadStudentAttemptsHistory() {
    const container = document.getElementById("student-attempts-container");
    if (!container) return;

    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading your attempts...</div>`;

    const { ok, data } = await apiFetch("/api/student/attempts", { method: "GET" });

    if (ok && data.attempts) {
        if (data.attempts.length === 0) {
            container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">You haven't attempted any exams yet.</div>`;
            return;
        }

        container.innerHTML = data.attempts.map(attempt => {
            const exam = attempt.exam;
            const isPublished = attempt.status === "published";
            const scoreDisplay = isPublished
                ? `Score: ${attempt.score}/${attempt.totalQuestions}`
                : "Results pending";
            const statusBadge = isPublished
                ? `<span class="badge" style="background:#2a2b3b; color: #a4e5c3;">Published</span>`
                : `<span class="badge secondary">Pending</span>`;

            return `
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon ${isPublished ? 'secondary' : 'primary'}">
                            <span class="material-symbols-outlined">${isPublished ? 'done_all' : 'pending'}</span>
                        </div>
                        ${statusBadge}
                    </div>
                    <h3 class="card-title">${exam ? exam.title : 'Deleted Exam'}</h3>
                    <p class="card-desc">${scoreDisplay} | Attempted on ${new Date(attempt.attemptDate).toLocaleDateString()}</p>
                    <button class="btn-card" style="background:var(--surface-container-high); color:var(--on-surface-variant)" ${!isPublished ? 'disabled' : ''} onclick="viewAttemptDetails('${attempt._id}')">
                        ${isPublished ? 'Review Results' : 'Results Pending'}
                        <span class="material-symbols-outlined">${isPublished ? 'visibility' : 'lock'}</span>
                    </button>
                </div>
            `;
        }).join('');
    } else {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--error);">Error loading attempts.</div>`;
    }
}

// Global function to view attempt details
window.viewAttemptDetails = async function(attemptId) {
    const { ok, data } = await apiFetch(`/api/student/attempts/${attemptId}`, { method: "GET" });

    if (ok && data.attempt) {
        renderAttemptDetailView(data.attempt);
    } else {
        alert("Failed to load attempt details.");
    }
};

function renderAttemptDetailView(attempt) {
    const container = document.getElementById("view-exams");
    if (!container) return;

    const responses = attempt.responses || [];
    let responsesHtml = '';

    if (responses.length > 0) {
        responsesHtml = responses.map((r, idx) => {
            const hasGraceMark = r.graceMarks > 0;
            return `
            <div class="response-item" style="margin-bottom: 1.5rem; padding: 1rem; background: var(--surface); border: 1px solid var(--surface-border); border-radius: 0.5rem; ${r.isCorrect ? 'border-left: 4px solid var(--success, #4caf50);' : hasGraceMark ? 'border-left: 4px solid var(--warning, #ff9800);' : 'border-left: 4px solid var(--error);'}">
                <p style="font-weight: bold; margin-bottom: 0.5rem;">Q${idx + 1}. ${escapeHtml(r.questionText)}</p>
                <p style="color: ${r.isCorrect ? 'var(--success, #4caf50)' : hasGraceMark ? 'var(--warning, #ff9800)' : 'var(--error)'};">
                    Your answer: ${escapeHtml(r.selectedAnswer) || 'Not answered'}
                    ${r.isCorrect ? '(Correct)' : hasGraceMark ? '(Incorrect + Grace Mark)' : '(Incorrect)'}
                </p>
                ${hasGraceMark ? `<p style="font-size: 0.85em; color: var(--warning, #ff9800);">+${r.graceMarks} grace mark${r.graceMarks !== 1 ? 's' : ''} awarded</p>
                ` : ''}
            </div>`;
        }).join('');
    }

    const percentage = attempt.totalQuestions > 0
        ? Math.round((attempt.score / attempt.totalQuestions) * 100)
        : 0;

    const graceMarksInfo = attempt.graceMarksApplied ? `
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--surface-border);">
            <div style="font-size: 0.9em; color: var(--on-surface-variant);">
                <div>Original Score: <strong>${attempt.originalScore}</strong></div>
                ${attempt.totalGraceMarks > 0 ? `<div style="color: var(--warning, #ff9800);">Grace Marks: +${attempt.totalGraceMarks}</div>` : ''}
            </div>
        </div>
    ` : '';

    container.innerHTML = `
        <div class="attempt-detail" style="max-width: 800px; margin: 0 auto; padding: 1rem;">
            <div style="margin-bottom: 2rem;">
                <button class="btn-card secondary" onclick="showExamsView()">
                    <span class="material-symbols-outlined">arrow_back</span>
                    Back to Attempts
                </button>
            </div>
            <div style="background: var(--surface); border: 1px solid var(--surface-border); border-radius: 1rem; padding: 2rem; margin-bottom: 2rem; text-align: center;">
                <h2>${attempt.exam ? attempt.exam.title : 'Deleted Exam'}</h2>
                <div style="font-size: 3rem; font-weight: bold; color: var(--primary); margin: 1rem 0;">
                    ${attempt.score} / ${attempt.totalQuestions}
                </div>
                <p style="color: var(--on-surface-variant);">${percentage}% Correct</p>
                ${graceMarksInfo}
                <span class="badge primary" style="margin-top: 1rem; display: inline-block;">
                    ${attempt.status.toUpperCase()}
                </span>
            </div>
            <h3 style="margin-bottom: 1rem;">Question Review</h3>
            ${responsesHtml || '<p style="color: var(--text-muted);">No response details available.</p>'}
        </div>
    `;
}

// Global function to show exams view
window.showExamsView = function() {
    const navExams = document.getElementById("nav-exams");
    if (navExams) {
        navExams.click();
    }
};

// Update the nav click handlers to load attempts
const originalNavExamsClick = navExams ? navExams.onclick : null;
if (navExams) {
    navExams.addEventListener("click", (e) => {
        loadStudentAttemptsHistory();
    });
}

// ------------------------------------------------------------------
// TEACHER EXAM REVIEW FLOW
// ------------------------------------------------------------------

// Global function to open exam review
window.openExamReview = async function(examId) {
    const container = document.getElementById("exams-list-container");
    if (container) {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">Loading review data...</div>`;
    }

    const { ok, data } = await apiFetch(`/api/teacher/exams/${examId}/review`, { method: "GET" });

    if (ok) {
        renderExamReviewInterface(data, examId);
    } else {
        alert(data.error || "Failed to load exam review data.");
        loadTeacherExams();
    }
};

function renderExamReviewInterface(data, examId) {
    const container = document.getElementById("view-exams");
    if (!container) return;

    const { exam, questionStats, totalAttempts, review } = data;
    const isPublished = exam.isPublished;
    const graceMarksApplied = review.status === "grace_marks_applied";

    let questionsHtml = questionStats.map((q, idx) => {
        const hasGraceMark = review.graceMarks.find(gm => gm.questionIndex === q.questionIndex);
        const optionDistHtml = Object.entries(q.optionDistribution)
            .map(([opt, count]) => {
                const percentage = totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0;
                const isCorrect = opt === q.correctAnswer;
                return `
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        <span style="font-size: 0.85em; color: ${isCorrect ? 'var(--success, #4caf50)' : 'var(--on-surface-variant)'}; min-width: 120px;">${escapeHtml(opt)}${isCorrect ? ' ✓' : ''}</span>
                        <div style="flex: 1; background: var(--surface-container); border-radius: 4px; overflow: hidden; height: 20px;">
                            <div style="width: ${percentage}%; background: ${isCorrect ? 'var(--success, #4caf50)' : 'var(--primary)'}; height: 100%; transition: width 0.3s;"></div>
                        </div>
                        <span style="font-size: 0.85em; min-width: 40px; text-align: right;">${count}</span>
                    </div>
                `;
            }).join('');

        return `
            <div class="review-question" style="margin-bottom: 2rem; padding: 1.5rem; background: var(--surface); border: 1px solid var(--surface-border); border-radius: 0.75rem; ${hasGraceMark ? 'border-left: 4px solid var(--warning, #ff9800);' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <h4 style="margin: 0; flex: 1;">Q${idx + 1}. ${escapeHtml(q.questionText)}</h4>
                    ${!isPublished ? `
                        <button class="btn-card ${hasGraceMark ? 'secondary' : 'primary'}" style="width: auto; padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="${hasGraceMark ? `removeGraceMark('${examId}', ${q.questionIndex})` : `showGraceMarkDialog('${examId}', ${q.questionIndex}, '${escapeHtml(q.questionText)}')`}">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">${hasGraceMark ? 'remove_circle' : 'add_circle'}</span>
                            ${hasGraceMark ? 'Remove Grace' : 'Add Grace'}
                        </button>
                    ` : ''}
                </div>

                ${hasGraceMark ? `
                    <div style="background: var(--warning-container, rgba(255,152,0,0.1)); padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                        <span class="badge" style="background: var(--warning, #ff9800); color: white;">Grace Mark Applied</span>
                        <span style="font-size: 0.9em; color: var(--on-surface-variant); margin-left: 0.5rem;">${hasGraceMark.marksToAward} mark${hasGraceMark.marksToAward !== 1 ? 's' : ''} awarded: ${escapeHtml(hasGraceMark.reason)}</span>
                    </div>
                ` : ''}

                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div style="text-align: center; padding: 0.75rem; background: var(--surface-container); border-radius: 0.5rem;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${q.totalAttempted}</div>
                        <div style="font-size: 0.75rem; color: var(--on-surface-variant);">Attempted</div>
                    </div>
                    <div style="text-align: center; padding: 0.75rem; background: var(--surface-container); border-radius: 0.5rem;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--success, #4caf50);">${q.totalCorrect}</div>
                        <div style="font-size: 0.75rem; color: var(--on-surface-variant);">Correct</div>
                    </div>
                    <div style="text-align: center; padding: 0.75rem; background: var(--surface-container); border-radius: 0.5rem;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--error);">${q.totalIncorrect}</div>
                        <div style="font-size: 0.75rem; color: var(--on-surface-variant);">Incorrect</div>
                    </div>
                    <div style="text-align: center; padding: 0.75rem; background: var(--surface-container); border-radius: 0.5rem;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--on-surface-variant);">${q.totalNotAttempted}</div>
                        <div style="font-size: 0.75rem; color: var(--on-surface-variant);">Not Attempted</div>
                    </div>
                </div>

                <div class="option-distribution" style="margin-top: 1rem;">
                    <p style="font-weight: bold; margin-bottom: 0.5rem; font-size: 0.9em;">Student Responses:</p>
                    ${optionDistHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="exam-review" style="max-width: 900px; margin: 0 auto; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <button class="btn-card secondary" onclick="showTeacherExamsView()">
                    <span class="material-symbols-outlined">arrow_back</span>
                    Back to Exams
                </button>
                <div style="text-align: right;">
                    <h2 style="margin: 0;">${escapeHtml(exam.title)}</h2>
                    <p style="margin: 0; color: var(--on-surface-variant); font-size: 0.9em;">${totalAttempts} student attempt${totalAttempts !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <div style="background: var(--surface); border: 1px solid var(--surface-border); border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <span class="badge ${review.status === 'grace_marks_applied' ? 'primary' : 'secondary'}" style="margin-bottom: 0.5rem; display: inline-block;">
                            Review Status: ${review.status.toUpperCase().replace(/_/g, ' ')}
                        </span>
                        <p style="margin: 0; color: var(--on-surface-variant);">
                            Grace marks configured: ${review.graceMarks.length} question${review.graceMarks.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    ${!isPublished && review.graceMarks.length > 0 && !graceMarksApplied ? `
                        <button class="btn-card primary" onclick="applyGraceMarks('${examId}')">
                            Apply Grace Marks
                            <span class="material-symbols-outlined">published_with_changes</span>
                        </button>
                    ` : ''}
                    ${graceMarksApplied ? `
                        <span class="badge" style="background: var(--success, #4caf50);">Grace Marks Applied</span>
                    ` : ''}
                </div>
            </div>

            <h3 style="margin-bottom: 1rem;">Question Review</h3>
            ${questionsHtml}
        </div>
    `;
}

// Show dialog to add grace mark
window.showGraceMarkDialog = function(examId, questionIndex, questionText) {
    const marksToAward = prompt(`Add grace mark for:\n\n"${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}"\n\nEnter marks to award (0-1, e.g., 0.5 or 1):`, "1");

    if (marksToAward === null) return;

    const parsedMarks = parseFloat(marksToAward);
    if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > 1) {
        alert("Please enter a valid number between 0 and 1");
        return;
    }

    const reason = prompt("Enter reason for grace mark:", "Question had issues");
    if (reason === null || reason.trim() === "") {
        alert("Reason is required");
        return;
    }

    addGraceMark(examId, questionIndex, reason.trim(), parsedMarks);
};

// Add grace mark
async function addGraceMark(examId, questionIndex, reason, marksToAward) {
    const { ok, data } = await apiFetch(`/api/teacher/exams/${examId}/grace-mark`, {
        method: "POST",
        body: JSON.stringify({ questionIndex, reason, marksToAward })
    });

    if (ok) {
        alert("Grace mark added successfully!");
        openExamReview(examId);
    } else {
        alert(data.error || "Failed to add grace mark.");
    }
}

// Remove grace mark
window.removeGraceMark = async function(examId, questionIndex) {
    if (!confirm("Remove grace mark from this question?")) return;

    const { ok, data } = await apiFetch(`/api/teacher/exams/${examId}/grace-mark/${questionIndex}`, {
        method: "DELETE"
    });

    if (ok) {
        alert("Grace mark removed successfully!");
        openExamReview(examId);
    } else {
        alert(data.error || "Failed to remove grace mark.");
    }
};

// Apply grace marks to all attempts
window.applyGraceMarks = async function(examId) {
    if (!confirm("Apply grace marks to all student attempts? This will recalculate scores for students who attempted the grace-marked questions.\n\nStudents who left those questions blank will NOT receive grace marks.")) return;

    const { ok, data } = await apiFetch(`/api/teacher/exams/${examId}/apply-grace-marks`, {
        method: "POST"
    });

    if (ok) {
        alert("Grace marks applied successfully!");
        openExamReview(examId);
    } else {
        alert(data.error || "Failed to apply grace marks.");
    }
};

// Show teacher exams view
window.showTeacherExamsView = function() {
    const navTeacherExams = document.getElementById("nav-exams");
    if (navTeacherExams) {
        navTeacherExams.click();
    }
};
