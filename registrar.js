const SUPABASE_URL = "https://kqfkegovkxhfncmhqfry.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DxPzJEo2fECPGIJrJ8CpGw_5xd1Y37Y";

const openButton = document.querySelector(".register");
const veil = document.querySelector(".veil");
const sheet = document.querySelector(".sheet");
const form = document.querySelector("#form-registro");
const closeButton = document.querySelector(".sheet-close");
const note = document.querySelector(".sheet-note");
const done = document.querySelector(".sheet-done");
const thanks = document.querySelector(".sheet-thanks");
const status = document.querySelector("#form-status");
const submitButton = form.querySelector("[type='submit']");

let lastFocus = null;

function fields() {
  return [...sheet.querySelectorAll("button, input")].filter(
    (field) => !field.disabled && !field.closest("[hidden]"),
  );
}

function openSheet() {
  lastFocus = document.activeElement;
  veil.hidden = false;
  document.body.classList.add("sheet-open");
  form.hidden = false;
  note.hidden = false;
  done.hidden = true;
  form.reset();
  clearErrors();
  form.querySelector("input").focus();
}

function closeSheet() {
  veil.hidden = true;
  document.body.classList.remove("sheet-open");
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
}

function clearErrors() {
  status.textContent = "";
  form.querySelectorAll(".field-error").forEach((error) => {
    error.hidden = true;
    error.textContent = "";
  });
  form.querySelectorAll("input").forEach((input) => {
    input.removeAttribute("aria-invalid");
  });
}

function showError(field, message) {
  const input = form.elements[field];
  const error = document.querySelector(`#error-${field}`);
  if (input) input.setAttribute("aria-invalid", "true");
  if (error) {
    error.hidden = false;
    error.textContent = message;
  }
  if (input) input.focus();
}

function clientError(nombre, telefono, email) {
  const digits = [...telefono].filter((character) => character >= "0" && character <= "9").length;
  if (nombre.trim().length < 2) return ["nombre", "Escribe tu nombre."];
  if (digits < 7 || digits > 15) return ["telefono", "Escribe un teléfono válido."];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return ["email", "Escribe un email válido."];
  return null;
}

openButton.addEventListener("click", openSheet);
closeButton.addEventListener("click", closeSheet);
document.querySelector(".sheet-ok").addEventListener("click", closeSheet);

veil.addEventListener("click", (event) => {
  if (event.target === veil) closeSheet();
});

document.addEventListener("keydown", (event) => {
  if (veil.hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeSheet();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = fields();
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const nombre = form.nombre.value;
  const telefono = form.telefono.value;
  const email = form.email.value;
  const problem = clientError(nombre, telefono, email);
  if (problem) {
    showError(problem[0], problem[1]);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Guardando…";
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/registrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        p_nombre: nombre.trim(),
        p_telefono: telefono.trim(),
        p_email: email.trim(),
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body.message || body.error || "No se pudo guardar. Inténtalo de nuevo.";
      if (message.includes("nombre")) showError("nombre", message);
      else if (message.includes("teléfono")) showError("telefono", message);
      else if (message.includes("email")) showError("email", message);
      else status.textContent = message;
      return;
    }

    form.hidden = true;
    note.hidden = true;
    done.hidden = false;
    thanks.textContent = body.actualizado
      ? "Ya estabas anotado. Actualizamos tus datos."
      : "Quedaste anotado. Nos vemos en la celebración.";
    document.querySelector(".sheet-ok").focus();
  } catch {
    status.textContent = "No se pudo guardar. Inténtalo de nuevo.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Anotar o Registrar";
  }
});
