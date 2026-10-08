/*
 * CommunityConnect - JavaScript
 * Handles resource sharing, resource details, contact form,
 * local storage and small UI interactions.
 */

document.addEventListener("DOMContentLoaded", async () => {

    // -------------------------------
    // Authentication UI
    // -------------------------------

    const authPage = document.getElementById("authPage");
    const communityApp = document.getElementById("communityApp");
    const authTabs = document.querySelectorAll("[data-auth-tab]");
    const authSwitchButtons = document.querySelectorAll("[data-switch-auth]");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    function switchAuthForm(formName) {
        const isLogin = formName === "login";

        if (!loginForm || !signupForm) return;

        loginForm.classList.toggle("hidden-auth-form", !isLogin);
        signupForm.classList.toggle("hidden-auth-form", isLogin);

        authTabs.forEach(tab => {
            tab.classList.toggle(
                "active",
                tab.dataset.authTab === formName
            );
        });
    }

    authTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            switchAuthForm(tab.dataset.authTab);
        });
    });

    authSwitchButtons.forEach(button => {
        button.addEventListener("click", () => {
            switchAuthForm(button.dataset.switchAuth);
        });
    });

    function showCommunityApp() {
        if (authPage) {
            authPage.style.display = "none";
        }

        if (communityApp) {
            communityApp.style.display = "block";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function showAuthPage() {
        if (authPage) {
            authPage.style.display = "flex";
        }

        if (communityApp) {
            communityApp.style.display = "none";
        }
    }

    function showAuthStatus(element, message, type = "error") {
        if (!element) return;

        element.textContent = message;
        element.className = `auth-status ${type}`;
    }

    // -------------------------------
    // Supabase authentication
    // -------------------------------

    // Supabase Project URL and publishable key.
    // Publishable keys are intended for browser/client code.
    const SUPABASE_URL = "https://ftuoiknilvnficehvoli.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_veHb14JyNb7ssUhw24vJNg_5oQoUxz2";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    async function handleSignedInUser(session) {
        if (session && session.user) {
            showCommunityApp();
        } else {
            showAuthPage();
        }
    }

    // Check whether a session already exists.
    const { data: { session } } = await supabase.auth.getSession();
    await handleSignedInUser(session);

    // Keep the UI synchronized with Supabase authentication.
    supabase.auth.onAuthStateChange((_event, currentSession) => {
        handleSignedInUser(currentSession);
    });

    // Real Supabase login.
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            const loginStatus = document.getElementById("loginStatus");

            if (!email || !password) {
                showAuthStatus(
                    loginStatus,
                    "Please enter your email and password.",
                    "error"
                );
                return;
            }

            if (!email.includes("@")) {
                showAuthStatus(
                    loginStatus,
                    "Please enter a valid email address.",
                    "error"
                );
                return;
            }

            if (password.length < 6) {
                showAuthStatus(
                    loginStatus,
                    "Password must contain at least 6 characters.",
                    "error"
                );
                return;
            }

            const submitButton = loginForm.querySelector(".auth-submit-btn");
            const originalText = submitButton.textContent;

            submitButton.disabled = true;
            submitButton.textContent = "Signing In...";

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            submitButton.disabled = false;
            submitButton.textContent = originalText;

            if (error) {
                showAuthStatus(
                    loginStatus,
                    error.message,
                    "error"
                );
                return;
            }

            if (data.session) {
                await recordLoginEvent(data.user);
                showAuthStatus(
                    loginStatus,
                    "Sign in successful!",
                    "success"
                );
                showCommunityApp();
            }
        });
    }

    // Real Supabase signup.
    if (signupForm) {
        signupForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("signupName").value.trim();
            const email = document.getElementById("signupEmail").value.trim();
            const password = document.getElementById("signupPassword").value;
            const confirmPassword =
                document.getElementById("signupConfirmPassword").value;
            const terms = document.getElementById("termsCheck").checked;
            const signupStatus = document.getElementById("signupStatus");

            if (!name || !email || !password || !confirmPassword) {
                showAuthStatus(
                    signupStatus,
                    "Please complete all fields.",
                    "error"
                );
                return;
            }

            if (!email.includes("@")) {
                showAuthStatus(
                    signupStatus,
                    "Please enter a valid email address.",
                    "error"
                );
                return;
            }

            if (password.length < 6) {
                showAuthStatus(
                    signupStatus,
                    "Password must contain at least 6 characters.",
                    "error"
                );
                return;
            }

            if (password !== confirmPassword) {
                showAuthStatus(
                    signupStatus,
                    "Passwords do not match.",
                    "error"
                );
                return;
            }

            if (!terms) {
                showAuthStatus(
                    signupStatus,
                    "Please accept the terms to continue.",
                    "error"
                );
                return;
            }

            const submitButton = signupForm.querySelector(".auth-submit-btn");
            const originalText = submitButton.textContent;

            submitButton.disabled = true;
            submitButton.textContent = "Creating Account...";

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });

            submitButton.disabled = false;
            submitButton.textContent = originalText;

            if (error) {
                showAuthStatus(
                    signupStatus,
                    error.message,
                    "error"
                );
                return;
            }

            // If email confirmation is enabled, Supabase returns no active session
            // until the user verifies the email.
            if (!data.session) {
                showAuthStatus(
                    signupStatus,
                    "Account created. Check your email to verify your account, then sign in.",
                    "success"
                );

                signupForm.reset();
                return;
            }

            showAuthStatus(
                signupStatus,
                "Account created successfully!",
                "success"
            );

            showCommunityApp();
        });
    }

    // Sign out helper. We will expose a logout button in a later UI step.
    async function signOutUser() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Sign out error:", error);
            window.alert("Could not sign out: " + error.message);
        }
    }

    // Log out from the Supabase session.
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            logoutBtn.disabled = true;
            logoutBtn.textContent = "Logging Out...";

            await signOutUser();

            logoutBtn.disabled = false;
            logoutBtn.textContent = "Log Out";
        });
    }

    // Keep the main application hidden until authentication is completed.
    showAuthPage();

    const resourceGrid = document.getElementById("resourceGrid");
    const resourceForm = document.querySelector(".resource-form");
    const contactForm = document.querySelector(".contact-form");
    const resourceStatus = document.getElementById("resourceStatus");
    const contactStatus = document.getElementById("contactStatus");

    let currentUserId = null;
    let currentPendingRequestIds = new Set();

    // -------------------------------
    // Utility functions
    // -------------------------------

    function showStatus(element, message, type = "success") {
        if (!element) return;

        element.textContent = message;
        element.className = `form-status ${type}`;

        setTimeout(() => {
            element.textContent = "";
            element.className = "form-status";
        }, 3500);
    }

    function escapeHTML(value) {
        const div = document.createElement("div");
        div.textContent = value;
        return div.innerHTML;
    }

    // -------------------------------
    // Supabase resource helpers
    // -------------------------------

    async function getCurrentUser() {
        const {
            data: { user },
            error
        } = await supabase.auth.getUser();

        if (error) {
            console.error("Could not get current user:", error);
            return null;
        }

        return user;
    }

    async function recordLoginEvent(user) {
        if (!user) return;

        const { error: eventError } = await supabase
            .from("login_events")
            .insert({
                user_id: user.id
            });

        if (eventError) {
            console.error("Login event could not be recorded:", eventError);
        }

        const { error: profileError } = await supabase
            .from("profiles")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", user.id);

        if (profileError) {
            console.error("Last login time could not be updated:", profileError);
        }
    }

    async function loadProfileName() {
        const user = await getCurrentUser();

        if (!user) return;

        const { data, error } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .maybeSingle();

        if (!error && data?.name) {
            const nameInput = document.getElementById("name");
            if (nameInput && !nameInput.value.trim()) {
                nameInput.value = data.name;
            }
        }
    }

    async function getResources() {
        const { data, error } = await supabase
            .from("resources")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Could not load resources:", error);
            return [];
        }

        return data || [];
    }

    async function loadPendingRequestIds() {
        currentPendingRequestIds = new Set();

        if (!currentUserId) return;

        const { data, error } = await supabase
            .from("resource_requests")
            .select("resource_id")
            .eq("requester_id", currentUserId)
            .eq("status", "Pending");

        if (error) {
            console.error("Could not load pending requests:", error);
            return;
        }

        (data || []).forEach(request => currentPendingRequestIds.add(String(request.resource_id)));
    }

    // -------------------------------
    // Resource card
    // -------------------------------

    function createResourceCard(resource) {
        const card = document.createElement("div");
        card.className = "resource-card user-resource-card";
        card.dataset.resourceId = resource.id;

        const categoryClass =
            resource.category.toLowerCase().replace(/\s+/g, "-");

        card.innerHTML = `
            <div class="resource-icon ${escapeHTML(categoryClass)}">
                ${escapeHTML(getCategoryIcon(resource.category))}
            </div>

            <div class="resource-content">
                <span class="category">
                    ${escapeHTML(resource.category)}
                </span>

                <h3>${escapeHTML(resource.resource_name)}</h3>

                <p>${escapeHTML(resource.description)}</p>

                <div class="resource-info">
                    📍 ${escapeHTML(resource.location)}
                </div>

                <span class="available resource-status">
                    ● ${escapeHTML(resource.status)}
                </span>

                <button type="button" class="view-details-btn">
                    View Details
                </button>

                ${
                    resource.user_id === currentUserId
                        ? `<button type="button"
                                   class="manage-requests-btn"
                                   data-id="${resource.id}">
                               Manage Requests
                           </button>
                           <button type="button"
                                   class="remove-resource-btn"
                                   data-id="${resource.id}">
                               Remove
                           </button>`
                        : currentPendingRequestIds.has(String(resource.id))
                            ? `<button type="button"
                                       class="take-resource-btn"
                                       disabled>
                                   Request Pending
                               </button>`
                            : resource.status === "Available"
                                ? `<button type="button"
                                           class="take-resource-btn"
                                           data-id="${resource.id}">
                                       Take Resource
                                   </button>`
                                : `<button type="button"
                                           class="take-resource-btn"
                                           disabled>
                                       ${escapeHTML(resource.status === "Requested" ? "Request Pending" : "Not Available")}
                                   </button>`
                }
            </div>
        `;

        card.querySelector(".view-details-btn")
            .addEventListener("click", () => {
                showResourceDetails({
                    name: resource.resource_name,
                    category: resource.category,
                    description: resource.description,
                    location: resource.location,
                    owner: resource.owner_name,
                    icon: getCategoryIcon(resource.category),
                    status: resource.status
                });
            });

        const removeButton = card.querySelector(".remove-resource-btn");

        if (removeButton) {
            removeButton.addEventListener("click", () => {
                removeResource(resource.id);
            });
        }

        const takeButton = card.querySelector(".take-resource-btn:not([disabled])");

        if (takeButton) {
            takeButton.addEventListener("click", () => {
                requestResource(resource);
            });
        }

        const manageButton = card.querySelector(".manage-requests-btn");

        if (manageButton) {
            manageButton.addEventListener("click", () => {
                manageResourceRequests(resource);
            });
        }

        return card;
    }

    function getCategoryIcon(category) {
        const icons = {
            Education: "📚",
            Electronics: "💻",
            Tools: "🔧",
            Transportation: "🚲",
            Other: "📦"
        };

        return icons[category] || "📦";
    }

    // -------------------------------
    // Resource details modal
    // -------------------------------

    function showResourceDetails(resource) {
        const existingModal = document.querySelector(".resource-modal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.className = "resource-modal";

        modal.innerHTML = `
            <div class="modal-content" role="dialog" aria-modal="true">
                <button type="button" class="modal-close" aria-label="Close">
                    ×
                </button>

                <div class="modal-icon">
                    ${escapeHTML(resource.icon)}
                </div>

                <span class="category">${escapeHTML(resource.category)}</span>

                <h2>${escapeHTML(resource.name)}</h2>

                <p>${escapeHTML(resource.description)}</p>

                <div class="modal-info">
                    <strong>Location:</strong>
                    ${escapeHTML(resource.location)}
                </div>

                ${
                    resource.owner
                        ? `<div class="modal-info">
                            <strong>Shared by:</strong>
                            ${escapeHTML(resource.owner)}
                           </div>`
                        : ""
                }

                ${
                    resource.status
                        ? `<span class="available modal-available">
                            ● ${escapeHTML(resource.status)}
                           </span>`
                        : ""
                }
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => modal.remove();

        modal.querySelector(".modal-close").addEventListener("click", closeModal);

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        document.addEventListener("keydown", function escapeHandler(event) {
            if (event.key === "Escape") {
                closeModal();
                document.removeEventListener("keydown", escapeHandler);
            }
        });
    }

    // -------------------------------
    // Take Resource / Request helpers
    // -------------------------------

    async function requestResource(resource) {
        const user = await getCurrentUser();

        if (!user) {
            window.alert("Please sign in before requesting a resource.");
            return;
        }

        if (resource.user_id === user.id) {
            window.alert("You cannot request your own resource.");
            return;
        }

        if (resource.status !== "Available") {
            window.alert("This resource is not currently available.");
            return;
        }

        const confirmed = window.confirm(
            `Send a request to take “${resource.resource_name}” from ${resource.owner_name}?`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("resource_requests")
            .insert({
                resource_id: resource.id,
                requester_id: user.id,
                requester_name: user.user_metadata?.full_name || user.email || "Community Member",
                status: "Pending"
            });

        if (error) {
            console.error("Resource request error:", error);

            if (error.code === "23505") {
                window.alert("You already have a pending request for this resource.");
            } else {
                window.alert("Could not send request: " + error.message);
            }
            return;
        }

        window.alert("Request sent successfully. The resource owner can now approve or reject it.");
        await loadPendingRequestIds();
        await renderSavedResources();
    }

    async function manageResourceRequests(resource) {
        const user = await getCurrentUser();

        if (!user || resource.user_id !== user.id) {
            window.alert("Only the resource owner can manage requests.");
            return;
        }

        const { data: requests, error } = await supabase
            .from("resource_requests")
            .select("id, requester_id, requester_name, status, created_at")
            .eq("resource_id", resource.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Could not load resource requests:", error);
            window.alert("Could not load requests: " + error.message);
            return;
        }

        showRequestsModal(resource, requests || []);
    }

    function showRequestsModal(resource, requests) {
        const existingModal = document.querySelector(".requests-modal");
        if (existingModal) existingModal.remove();

        const modal = document.createElement("div");
        modal.className = "resource-modal requests-modal";

        const requestHTML = requests.length
            ? requests.map(request => `
                <div class="request-item">
                    <div>
                        <strong>${escapeHTML(request.requester_name)}</strong>
                        <small>${escapeHTML(new Date(request.created_at).toLocaleString())}</small>
                        <span class="request-status">${escapeHTML(request.status)}</span>
                    </div>
                    ${
                        request.status === "Pending"
                            ? `<div class="request-actions">
                                <button type="button" class="approve-request-btn" data-id="${request.id}">Approve</button>
                                <button type="button" class="reject-request-btn" data-id="${request.id}">Reject</button>
                               </div>`
                            : ""
                    }
                </div>
            `).join("")
            : `<p class="no-requests">No requests have been made for this resource yet.</p>`;

        modal.innerHTML = `
            <div class="modal-content" role="dialog" aria-modal="true">
                <button type="button" class="modal-close" aria-label="Close">×</button>
                <div class="modal-icon">${escapeHTML(getCategoryIcon(resource.category))}</div>
                <span class="category">${escapeHTML(resource.category)}</span>
                <h2>Requests for ${escapeHTML(resource.resource_name)}</h2>
                <p>Review people who want to take this resource.</p>
                <div class="requests-list">${requestHTML}</div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelector(".modal-close").addEventListener("click", closeModal);
        modal.addEventListener("click", event => {
            if (event.target === modal) closeModal();
        });

        modal.querySelectorAll(".approve-request-btn").forEach(button => {
            button.addEventListener("click", async () => {
                await updateRequestStatus(button.dataset.id, "Approved", resource);
            });
        });

        modal.querySelectorAll(".reject-request-btn").forEach(button => {
            button.addEventListener("click", async () => {
                await updateRequestStatus(button.dataset.id, "Rejected", resource);
            });
        });
    }

    async function updateRequestStatus(requestId, status, resource) {
        const user = await getCurrentUser();
        if (!user || resource.user_id !== user.id) return;

        const { data: request, error: requestLookupError } = await supabase
            .from("resource_requests")
            .select("requester_id")
            .eq("id", requestId)
            .maybeSingle();

        if (requestLookupError || !request) {
            console.error("Could not find request:", requestLookupError);
            window.alert("Could not find the request.");
            return;
        }

        const { error } = await supabase
            .from("resource_requests")
            .update({ status })
            .eq("id", requestId);

        if (error) {
            console.error("Request update error:", error);
            window.alert("Could not update request: " + error.message);
            return;
        }

        if (status === "Approved") {
            const { error: resourceError } = await supabase
                .from("resources")
                .update({
                    status: "Taken",
                    taken_by: request.requester_id,
                    taken_at: new Date().toISOString()
                })
                .eq("id", resource.id);

            if (resourceError) {
                console.error("Resource status update error:", resourceError);
                window.alert("Request approved, but the resource status could not be updated: " + resourceError.message);
            }
        }

        window.alert(`Request ${status.toLowerCase()}.`);
        document.querySelector(".requests-modal")?.remove();
        await renderSavedResources();
    }

    // -------------------------------
    // Add resource form
    // -------------------------------

    if (resourceForm) {
        resourceForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("name").value.trim();
            const resourceName =
                document.getElementById("resource").value.trim();
            const category = document.getElementById("category").value;
            const location =
                document.getElementById("location").value.trim();
            const description =
                document.getElementById("description").value.trim();

            if (!name || !resourceName || !location || !description) {
                showStatus(
                    resourceStatus,
                    "Please fill in all resource fields.",
                    "error"
                );
                return;
            }

            if (!category || category === "Select Category") {
                showStatus(
                    resourceStatus,
                    "Please select a resource category.",
                    "error"
                );
                return;
            }

            const user = await getCurrentUser();

            if (!user) {
                showStatus(
                    resourceStatus,
                    "Please sign in before sharing a resource.",
                    "error"
                );
                return;
            }

            currentUserId = user.id;

            const submitButton =
                resourceForm.querySelector(".submit-btn");

            submitButton.disabled = true;
            const originalText = submitButton.textContent;
            submitButton.textContent = "Saving...";

            const { error } = await supabase
                .from("resources")
                .insert({
                    user_id: user.id,
                    resource_name: resourceName,
                    category: category,
                    location: location,
                    description: description,
                    status: "Available"
                });

            submitButton.disabled = false;
            submitButton.textContent = originalText;

            if (error) {
                console.error("Resource insert error:", error);

                showStatus(
                    resourceStatus,
                    "Could not save resource: " + error.message,
                    "error"
                );
                return;
            }

            resourceForm.reset();

            showStatus(
                resourceStatus,
                "Resource shared successfully!",
                "success"
            );

            await renderSavedResources();

            document.getElementById("resources").scrollIntoView({
                behavior: "smooth"
            });
        });
    }

    // -------------------------------
    // Display resources from Supabase
    // -------------------------------

    async function renderSavedResources() {
        if (!resourceGrid) return;

        await loadPendingRequestIds();

        resourceGrid
            .querySelectorAll(".user-resource-card")
            .forEach(card => card.remove());

        const resources = await getResources();

        resources.forEach(resource => {
            resourceGrid.appendChild(createResourceCard(resource));
        });
    }

    // -------------------------------
    // Remove a resource from Supabase
    // -------------------------------

    async function removeResource(resourceId) {
        const confirmed = window.confirm(
            "Remove this resource from the community?"
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("resources")
            .delete()
            .eq("id", resourceId);

        if (error) {
            console.error("Resource delete error:", error);
            window.alert("Could not remove resource: " + error.message);
            return;
        }

        await renderSavedResources();
    }

    // -------------------------------
    // Existing "View Details" buttons
    // -------------------------------

    document.querySelectorAll(".resource-card").forEach(card => {
        if (card.classList.contains("user-resource-card")) return;

        const button = card.querySelector("button");
        if (!button) return;

        button.addEventListener("click", () => {
            const title = card.querySelector("h3")?.textContent.trim() || "Resource";
            const category = card.querySelector(".category")?.textContent.trim() || "";
            const description = card.querySelector("p")?.textContent.trim() || "";
            const location = card.querySelector(".resource-info")?.textContent
                .replace("📍", "")
                .trim() || "";
            const icon = card.querySelector(".resource-icon")?.textContent.trim() || "📦";

            showResourceDetails({
                name: title,
                category,
                description,
                location,
                icon
            });
        });
    });

    // -------------------------------
    // Contact form
    // -------------------------------

    if (contactForm) {
        contactForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = document.getElementById("contact-name").value.trim();
            const email = document.getElementById("email").value.trim();
            const message = document.getElementById("message").value.trim();

            if (!name || !email || !message) {
                showStatus(
                    contactStatus,
                    "Please complete all contact fields.",
                    "error"
                );
                return;
            }

            if (!email.includes("@") || !email.includes(".")) {
                showStatus(
                    contactStatus,
                    "Please enter a valid email address.",
                    "error"
                );
                return;
            }

            const user = await getCurrentUser();

            const { error } = await supabase
                .from("contact_messages")
                .insert({
                    user_id: user?.id || null,
                    name,
                    email,
                    message
                });

            if (error) {
                console.error("Contact message error:", error);
                showStatus(
                    contactStatus,
                    "Could not submit message: " + error.message,
                    "error"
                );
                return;
            }

            showStatus(
                contactStatus,
                "Message submitted successfully!",
                "success"
            );

            contactForm.reset();
        });
    }

    // Load resources from Supabase after authentication.
    const {
        data: { user: initialUser }
    } = await supabase.auth.getUser();

    if (initialUser) {
        currentUserId = initialUser.id;
        await loadProfileName();
        await renderSavedResources();
    }

    supabase.auth.onAuthStateChange(async (_event, currentSession) => {
        if (currentSession?.user) {
            currentUserId = currentSession.user.id;
            await loadProfileName();
            await renderSavedResources();
        } else {
            currentUserId = null;
            currentPendingRequestIds = new Set();
        }
    });
});
