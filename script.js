// API base URL
const API_BASE_URL = "https://66ea4de055ad32cda4784edf.mockapi.io";
// Helper functions
function getLoggedInUser() {
    return JSON.parse(localStorage.getItem("loggedInUser"));
}

function setLoggedInUser(user) {
    localStorage.setItem("loggedInUser", JSON.stringify(user));
}

async function apiRequest(endpoint, method = "GET", data = null) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

async function getUsers() {
    return await apiRequest("users");
}

async function createUser(user) {
    return await apiRequest("users", "POST", user);
}

async function getArticles() {
    return await apiRequest("articles");
}

async function createArticle(article) {
    return await apiRequest("articles", "POST", article);
}

async function deleteArticle(articleId) {
    return await apiRequest(`articles/${articleId}`, "DELETE");
}

// Update article form visibility
function updateArticleFormVisibility() {
    const user = getLoggedInUser();
    if (articleSection) {
        if (user) {
            articleSection.style.display = "block";
        } else {
            articleSection.style.display = "none";
        }
    }
}

// Registration
const registerForm = document.getElementById("register-form");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("register-name").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const avatarFile = document.getElementById("register-avatar").files[0];

        const users = await getUsers();
        if (users.find((user) => user.email === email)) {
            alert("Email already registered");
            return;
        }

        let avatarBase64 = null;
        if (avatarFile) {
            avatarBase64 = await fileToBase64(avatarFile);
        }

        try {
            await createUser({ name, email, password, avatar: avatarBase64 });
            alert("Registration successful");
            window.location.href = "login.html";
        } catch (error) {
            console.error("Failed to register user:", error);
            if (error.toString().includes("413")) {
                alert(
                    "Failed to register. The avatar is too large, try a smaller image.",
                );
            } else {
                alert("Failed to register. Please try again.");
            }
        }
    });
}

// Login
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        const users = await getUsers();
        const user = users.find((user) =>
            user.email === email && user.password === password
        );
        if (user) {
            setLoggedInUser(user);
            alert("Login successful");
            updateUIForAuthState();
            window.location.href = "index.html";
        } else {
            alert("Invalid credentials");
        }
    });
}

// Profile
const profileInfo = document.getElementById("profile-info");
const editProfileBtn = document.getElementById("edit-profile-btn");
const editProfileForm = document.getElementById("edit-profile-form");

if (profileInfo) {
    const user = getLoggedInUser();
    if (user) {
        displayProfileInfo(user);
    } else {
        window.location.href = "login.html";
    }
}

async function displayProfileInfo(user) {
    let avatarHtml = "";
    if (user.avatar) {
        avatarHtml = `<img src="${user.avatar}" alt="Avatar" class="avatar">`;
    }

    profileInfo.innerHTML = `
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        ${avatarHtml}
    `;
}

if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
        const user = getLoggedInUser();
        document.getElementById("edit-name").value = user.name;
        document.getElementById("edit-email").value = user.email;
        editProfileForm.style.display = "block";
    });
}

if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = getLoggedInUser();
        user.name = document.getElementById("edit-name").value;
        user.email = document.getElementById("edit-email").value;

        const avatarFile = document.getElementById("avatar-upload").files[0];
        if (avatarFile) {
            try {
                const avatarBase64 = await fileToBase64(avatarFile);
                user.avatar = avatarBase64;
            } catch (error) {
                console.error("Failed to save avatar:", error);
                alert("Failed to save avatar. Please try again.");
                return;
            }
        }

        setLoggedInUser(user);
        const users = await getUsers();
        const index = users.findIndex((u) => u.email === user.email);
        users[index] = user;
        await apiRequest(`users/${user.id}`, "PUT", user);

        displayProfileInfo(user);
        editProfileForm.style.display = "none";
        alert("Profile updated successfully");
    });
}

// Article creation
const articleForm = document.getElementById("article-form");
const articleSection = document.querySelector(".article-section");
const imagePreview = document.getElementById("image-preview");

if (articleForm) {
    updateArticleFormVisibility();

    const articleImage = document.getElementById("article-image");
    articleImage.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    });

    articleForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = getLoggedInUser();
        if (!user) {
            alert("Please login to publish articles");
            return;
        }

        const title = document.getElementById("article-title").value;
        const content = document.getElementById("article-content").value;
        const imageFile = document.getElementById("article-image").files[0];

        let imageBase64 = null;
        if (imageFile) {
            imageBase64 = await fileToBase64(imageFile);
        }

        try {
            const newArticle = {
                title,
                content,
                author: user.name,
                date: new Date().toISOString(),
                image: imageBase64,
            };
            await createArticle(newArticle);
            alert("Article published successfully");
            articleForm.reset();
            imagePreview.style.display = "none";
            displayUserArticles();
        } catch (error) {
            console.error("Failed to publish article:", error);
            if (error.toString().includes("413")) {
                alert(
                    "Failed to publish article. The image is too large, try a smaller image.",
                );
            } else {
                alert("Failed to publish article. Please try again.");
            }
        }
    });
}

// Display user articles
async function displayUserArticles() {
    const userArticles = document.getElementById("user-articles");
    if (userArticles) {
        const user = getLoggedInUser();
        if (!user) return;

        const articles = await getArticles();
        const userArticlesFiltered = articles.filter((article) =>
            article.author === user.name
        );
        userArticles.innerHTML = userArticlesFiltered.map((article) => `
            <div class="article">
                <h2>${article.title}</h2>
                ${
            article.image
                ? `<img src="${article.image}" alt="Article image" style="max-width: 300px;">`
                : ""
        }
                <p>${article.content}</p>
                <small>Published on: ${
            new Date(article.date).toLocaleDateString()
        }</small>
                <button class="delete-article" data-id="${article.id}">Delete</button>
                <a href="article-view.html?id=${article.id}">Read More</a>
            </div>
        `).join("");

        // Add event listeners for delete buttons
        const deleteButtons = userArticles.querySelectorAll(".delete-article");
        deleteButtons.forEach((button) => {
            button.addEventListener("click", async (e) => {
                const articleId = e.target.getAttribute("data-id");
                await deleteArticle(articleId);
                displayUserArticles();
            });
        });
    }
}

// Display all articles on home page
const articlesContainer = document.getElementById("articles-container");
if (articlesContainer) {
    getArticles().then((articles) => {
        articlesContainer.innerHTML = articles.map((article) => `
            <div class="article">
                <h2>${article.title}</h2>
                ${
            article.image
                ? `<img src="${article.image}" alt="Article image" style="max-width: 300px;">`
                : ""
        }
                <p>${article.content}</p>
                <small>By ${article.author} on ${
            new Date(article.date).toLocaleDateString()
        }</small>
            </div>
        `).join("");
    });
}

// Call displayUserArticles on article.html page load
if (window.location.pathname.includes("article.html")) {
    displayUserArticles();
}

// Call this function when logging in or out
function updateUIForAuthState() {
    updateArticleFormVisibility();
    updateNavbar();
    // Add any other UI updates here
}

// Add this function to update the navigation bar
function updateNavbar() {
    const navLinks = document.querySelector(".nav-links");
    const user = getLoggedInUser();

    if (navLinks) {
        if (user) {
            navLinks.innerHTML = `
                <li><a href="index.html">Home</a></li>
                <li><a href="article.html">Articles</a></li>
                <li><a href="profile.html">Profile</a></li>
                <li><a href="#" id="logout-link">Logout</a></li>
            `;
            // Add event listener for logout
            document.getElementById("logout-link").addEventListener(
                "click",
                (e) => {
                    e.preventDefault();
                    localStorage.removeItem("loggedInUser");
                    alert("Logged out successfully");
                    updateUIForAuthState();
                    window.location.href = "index.html";
                },
            );
        } else {
            navLinks.innerHTML = `
                <li><a href="index.html">Home</a></li>
                <li><a href="login.html">Login</a></li>
                <li><a href="register.html">Register</a></li>
            `;
        }
    }
}

// Call updateUIForAuthState on page load
document.addEventListener("DOMContentLoaded", updateUIForAuthState);

// Full article view
const fullArticleContainer = document.getElementById("full-article");
if (fullArticleContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get("id");
    if (articleId) {
        getArticles().then((articles) => {
            const article = articles.find((a) => a.id === articleId);
            if (article) {
                displayFullArticle(article);
            } else {
                fullArticleContainer.innerHTML = "<p>Article not found</p>";
            }
        });
    } else {
        fullArticleContainer.innerHTML = "<p>Invalid article ID</p>";
    }
}

function displayFullArticle(article) {
    fullArticleContainer.innerHTML = `
        <h1>${article.title}</h1>
        ${
        article.image
            ? `<img src="${article.image}" alt="Article image" style="max-width: 100%; margin-bottom: 20px;">`
            : ""
    }
        <p>${article.content}</p>
        <small>By ${article.author} on ${
        new Date(article.date).toLocaleDateString()
    }</small>
    `;
}

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}