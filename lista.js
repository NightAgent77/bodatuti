const claveForm = document.querySelector("#clave-form");
const claveInput = document.querySelector("#clave");
const claveError = document.querySelector("#clave-error");
const resultado = document.querySelector("#resultado");
const cuenta = document.querySelector("#cuenta");
const vacio = document.querySelector("#vacio");
const personas = document.querySelector("#personas");
const STORAGE_KEY = "lista-clave";

function fecha(valor) {
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return valor;
  return date.toLocaleString("es-PR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function pintar(invitados) {
  claveForm.hidden = true;
  resultado.hidden = false;
  personas.replaceChildren();

  const total = invitados.length;
  cuenta.textContent =
    total === 1 ? "1 persona anotada" : `${total} personas anotadas`;
  vacio.hidden = total !== 0;
  if (!total) return;

  for (const persona of invitados) {
    const item = document.createElement("li");
    const nombre = document.createElement("p");
    nombre.className = "persona-nombre";
    nombre.textContent = persona.nombre;

    const telefono = document.createElement("a");
    telefono.href = `tel:${persona.telefono.replace(/[^\d+]/g, "")}`;
    telefono.textContent = persona.telefono;

    const email = document.createElement("a");
    email.href = `mailto:${persona.email}`;
    email.textContent = persona.email;

    const cuando = document.createElement("time");
    cuando.dateTime = persona.creado;
    cuando.textContent = fecha(persona.creado);

    item.append(nombre, telefono, email, cuando);
    personas.append(item);
  }
}

async function cargar(clave) {
  const response = await fetch("/api/invitados", {
    headers: { "X-Clave": clave },
  });
  if (response.status === 401) {
    sessionStorage.removeItem(STORAGE_KEY);
    claveError.hidden = false;
    claveForm.hidden = false;
    resultado.hidden = true;
    claveInput.focus();
    return;
  }
  if (!response.ok) {
    claveError.hidden = false;
    claveError.textContent = "No se pudo cargar la lista.";
    return;
  }
  const body = await response.json();
  sessionStorage.setItem(STORAGE_KEY, clave);
  claveError.hidden = true;
  pintar(body.invitados || []);
}

claveForm.addEventListener("submit", (event) => {
  event.preventDefault();
  claveError.hidden = true;
  cargar(claveInput.value);
});

const guardada = sessionStorage.getItem(STORAGE_KEY);
if (guardada) cargar(guardada);
