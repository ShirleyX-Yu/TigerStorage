// Utility to store and retrieve CSRF token globally
let csrfToken = null;

export function setCSRFToken(token) {
  csrfToken = token;
}

export function getCSRFToken() {
  return csrfToken;
} 