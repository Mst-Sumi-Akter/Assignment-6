const API = "https://openapi.programming-hero.com/api";

// DOM references
const categoriesEl = document.getElementById("categories");
const cardsEl = document.getElementById("cards");
const spinnerEl = document.getElementById("spinner");
const cartListEl = document.getElementById("cart-list");
const cartTotalEl = document.getElementById("cart-total");
const modalEl = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const closeModalBtn = document.getElementById("close-modal");

let cart = [];
let activeCategory = "all";

// Spinner helpers
function showSpinner() { spinnerEl.classList.remove("hidden"); }
function hideSpinner() { spinnerEl.classList.add("hidden"); }
function money(n) { return Number(n).toFixed(2); }

// ------------------ Categories ------------------
async function loadCategories() {
  try {
    showSpinner();
    const res = await fetch(`${API}/categories`);
    const json = await res.json();
    if (json?.categories) renderCategories(json.categories);
    else categoriesEl.innerHTML = "<p class='text-red-600'>No categories found.</p>";
  } catch (err) {
    console.error(err);
    categoriesEl.innerHTML = "<p class='text-red-600'>Failed to load categories.</p>";
  } finally {
    hideSpinner();
  }
}

function renderCategories(categories) {
  categoriesEl.innerHTML = "";

  // "All Trees" button
  const allBtn = createCategoryButton("All Trees", "all");
  categoriesEl.appendChild(allBtn);

  // Other categories
  categories.forEach(c => {
    const btn = createCategoryButton(c.category_name, c.id);
    categoriesEl.appendChild(btn);
  });

  // Set default active category
  setActiveCategory("all");
}

function createCategoryButton(text, id) {
  const btn = document.createElement("button");
  btn.className = "px-3 py-1 rounded text-left text-black hover:bg-green-200 transition-colors duration-200";
  btn.textContent = text;
  btn.dataset.id = id;

  btn.addEventListener("click", async () => {
    activeCategory = id;
    setActiveCategory(id);

    try {
      showSpinner();
      if (id === "all") {
        await loadAllPlants();
      } else {
        await loadPlantsByCategory(id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      hideSpinner();
    }
  });

  return btn;
}

function setActiveCategory(id) {
  const buttons = document.querySelectorAll("#categories button");
  buttons.forEach(b => {
    if (b.dataset.id.toString() === id.toString()) {
      b.classList.add("bg-green-800", "text-white");
      b.classList.remove("text-black", "hover:bg-green-200");
    } else {
      b.classList.remove("bg-green-800", "text-white");
      b.classList.add("text-black", "hover:bg-green-200");
    }
  });
}

// ------------------ Plants ------------------
async function loadAllPlants() {
  try {
    showSpinner();
    const res = await fetch(`${API}/plants`);
    const json = await res.json();
    if (json?.plants) {
      const plants = Array.isArray(json.plants) ? json.plants : [json.plants];
      renderCards(plants);
    } else {
      cardsEl.innerHTML = "<p class='text-gray-600'>No plants found.</p>";
    }
  } catch (err) {
    console.error(err);
    cardsEl.innerHTML = "<p class='text-red-600'>Failed to load plants.</p>";
  } finally {
    hideSpinner();
  }
}

async function loadPlantsByCategory(id) {
  try {
    showSpinner();
    const res = await fetch(`${API}/category/${id}`);
    const json = await res.json();
    if (json?.plants) {
      const plants = Array.isArray(json.plants) ? json.plants : [json.plants];
      renderCards(plants);
    } else {
      cardsEl.innerHTML = "<p class='text-gray-600'>No plants found in this category.</p>";
    }
  } catch (err) {
    console.error(err);
    cardsEl.innerHTML = "<p class='text-red-600'>Failed to load category plants.</p>";
  } finally {
    hideSpinner();
  }
}

// ------------------ Render Cards ------------------
function renderCards(plants) {
  cardsEl.innerHTML = "";
  if (!plants.length) {
    cardsEl.innerHTML = "<p class='text-gray-600'>No plants found.</p>";
    return;
  }

  plants.forEach(p => {
    const card = document.createElement("div");
    card.className = "bg-white rounded shadow p-3 flex flex-col";

    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}" class="w-full h-32 object-cover rounded mb-2"/>
      <h4 class="font-bold cursor-pointer" data-id="${p.id}">${p.name}</h4>
      <p class="text-sm text-gray-600">${p.description?.slice(0,70) || "No description available."}</p>
      <div class="flex justify-between items-center mt-2 text-sm">
        <span class="bg-green-100 text-green-700 px-2 py-1 rounded">${p.category}</span>
        <span class="font-semibold">$${money(p.price)}</span>
      </div>
      <button class="mt-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Add to Cart</button>
    `;

    // Open modal
    card.querySelector("h4").addEventListener("click", () => openModal(p.id));

    // Add to cart
    card.querySelector("button").addEventListener("click", () =>
      addToCart({id: p.id, name: p.name, price: p.price})
    );

    cardsEl.appendChild(card);
  });
}

// ------------------ Modal ------------------
async function openModal(id) {
  modalBody.innerHTML = `<div class="flex justify-center"><div class="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>`;
  modalEl.classList.remove("hidden");
  modalEl.classList.add("flex");

  try {
    const res = await fetch(`${API}/plant/${id}`);
    const json = await res.json();
    if (json?.plants) {
      const p = json.plants;
      modalBody.innerHTML = `
        <h3 class="text-xl font-bold mb-2">${p.name}</h3>
        <img src="${p.image}" class="w-full h-48 object-cover rounded mb-3"/>
        <p>${p.description || "No description available."}</p>
        <p class="mt-2"><strong>Price:</strong> $${money(p.price)}</p>
      `;
    } else {
      modalBody.innerHTML = "<p class='text-gray-600'>No details available.</p>";
    }
  } catch (err) {
    console.error(err);
    modalBody.innerHTML = "<p class='text-red-600'>Failed to load details.</p>";
  }
}

closeModalBtn.addEventListener("click", () => {
  modalEl.classList.add("hidden");
  modalEl.classList.remove("flex");
});

// ------------------ Cart ------------------
function addToCart(item) {
  cart.push(item);
  renderCart();
}

function removeFromCart(i) {
  cart.splice(i,1);
  renderCart();
}

function renderCart() {
  cartListEl.innerHTML = "";
  let total = 0;

  cart.forEach((it,i) => {
    total += Number(it.price);
    const li = document.createElement("li");
    li.className = "flex justify-between items-center text-sm";
    li.innerHTML = `${it.name} - $${money(it.price)} <button class="ml-2 text-red-600 hover:text-red-800">❌</button>`;
    li.querySelector("button").addEventListener("click", () => removeFromCart(i));
    cartListEl.appendChild(li);
  });

  cartTotalEl.textContent = money(total);
}

// ------------------ Initialize ------------------
loadCategories().then(() => loadAllPlants());
