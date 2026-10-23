// auth.js – sign up and sign in, using only localStorage.
// NOTE: passwords are saved as plain text here to keep the demo simple.
// Real websites never do this; they use a server and hashed passwords.

let mode = "signin";   // the form is either "signin" or "signup"

// If someone is already logged in, skip the login page
if (localStorage.getItem("loggedInUser")) {
  window.location.href = "home.html";
}

// Read the saved users list from localStorage (or an empty list if none yet)
function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

// Show a red message under the form
function showMessage(text) {
  document.getElementById("message").textContent = text;
}

// Switch between Sign In and Sign Up (runs when the bottom link is clicked)
function switchMode(event) {
  event.preventDefault();                       // stop the link from jumping the page
  mode = (mode === "signin") ? "signup" : "signin";
  const signingUp = (mode === "signup");

  // Show or hide the extra fields (name, confirm password)
  document.querySelectorAll(".signup-only").forEach(function (field) {
    field.classList.toggle("hidden", !signingUp);
  });

  // Change the texts to match the mode
  document.getElementById("formTitle").textContent = signingUp ? "Create account" : "Sign in";
  document.getElementById("submitBtn").textContent = signingUp ? "Sign up" : "Sign in";
  document.getElementById("switchText").textContent = signingUp ? "Already registered?" : "New here?";
  document.getElementById("switchLink").textContent = signingUp ? "Sign in" : "Create an account";
  showMessage("");
}

// Runs when the form is submitted
function submitForm(event) {
  event.preventDefault();                       // stop the page from reloading

  // Read what the user typed (trim removes spaces at the ends)
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;

  // ---- Validation (same checks for both modes) ----
  if (!email.includes("@") || !email.includes(".")) {
    showMessage("Enter a valid email address.");
    return;
  }
  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    return;
  }

  const users = getUsers();

  if (mode === "signup") {
    // ---- Sign up checks and saving ----
    if (name === "") {
      showMessage("Enter your name.");
      return;
    }
    if (password !== confirm) {
      showMessage("Passwords do not match.");
      return;
    }
    // .some() is true if at least one saved user has this email
    if (users.some(function (u) { return u.email === email; })) {
      showMessage("This email is already registered. Try signing in.");
      return;
    }
    users.push({ name: name, email: email, password: password });
    localStorage.setItem("users", JSON.stringify(users));   // save the updated list
    localStorage.setItem("loggedInUser", email);            // log them in straight away
    window.location.href = "home.html";
  } else {
    // ---- Sign in: look for a user with this email AND password ----
    const found = users.find(function (u) {
      return u.email === email && u.password === password;
    });
    if (!found) {
      showMessage("Wrong email or password.");
      return;
    }
    localStorage.setItem("loggedInUser", email);            // remember who is logged in
    window.location.href = "home.html";                     // go to the country page
  }
}
