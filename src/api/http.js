// src/api/http.js
// Small helper for calling the backend. It gives clear error messages, and if the server says
// the session is no longer valid (401), it logs the user out automatically.

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function request(url, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // free servers can take up to a minute to wake up

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error('Cannot reach the server. Please check your internet connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    // the server sent no JSON; handled below
  }

  if (response.status === 401 && token && unauthorizedHandler) unauthorizedHandler();

  if (!response.ok) {
    const error = new Error((data && data.error) || `Request failed (${response.status}).`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}