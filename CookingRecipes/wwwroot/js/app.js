document.addEventListener('DOMContentLoaded', main);

let allRecipes = [];
let allCategories = [];

async function main() {
    // 1) Деталі рецепту
    if (document.getElementById('recipe-detail')) {
        initRecipeDetails();
        return;
    }

    // 2) Редагування рецепту
    if (document.getElementById('recipe-form-edit')) {
        initEditRecipe();
        return;
    }

    // 3) Створення рецепту
    if (document.getElementById('recipe-form')) {
        initCreateRecipe();
        return;
    }

    // 4) Сторінки категорій/інгредієнтів
    if (document.getElementById('cards-container')) {
        const isIng = !!document.getElementById('btn-add-ingredient');
        initListPage({
            apiUrl: isIng ? '/api/ingredients' : '/api/categories',
            btnAddId: isIng ? 'btn-add-ingredient' : 'btn-add-category',
            formId: 'form-add',
            inputId: isIng ? 'new-names' : 'new-name',
            submitId: 'submit-add',
            containerId: 'cards-container',
            placeholderSingular: isIng ? 'інгредієнт(и) через кому' : 'категорію',
            itemKey: 'name',
            showCalories: isIng
        });
        return;
    }

    // 5) Головна сторінка з фільтрами + рецепти
    const listEl = document.getElementById('recipe-list');
    if (listEl) {
        await initRecipeFilters();
        await initRecipeList();  // використовуємо той, що застосовує фільтри
        return;
    }

    // ніде не підійшло — просто нічого
}

// ---- ініціалізація фільтрів ----
async function initRecipeFilters() {
    // підвантажуємо категорії
    const resCats = await fetch('/api/categories');
    allCategories = await resCats.json();

    // малюємо чекбокси
    const fc = document.getElementById('filterCategories');
    fc.innerHTML = allCategories.map(c => `
    <div class="form-check col-sm-6 col-md-4 col-lg-3">
      <input class="form-check-input" type="checkbox" id="fCat${c.id}" value="${c.id}">
      <label class="form-check-label" for="fCat${c.id}">${c.name}</label>
    </div>
  `).join('');

    // підписуємо всі контрол-елементи
    const controls = [
        'fEasy', 'fMedium', 'fHard',
        'fTimeMin', 'fTimeMax',
        'fCountMin', 'fCountMax',
        'fVegetarian', 'fDrink',
        'fCalMin', 'fCalMax'
    ];
    controls.forEach(id =>
        document.getElementById(id).addEventListener('input', applyFilters)
    );
    document.querySelectorAll('#filterCategories input')
        .forEach(cb => cb.addEventListener('change', applyFilters));

    // кнопка Скинути
    document.getElementById('btn-reset-filters')
        .addEventListener('click', () => {
            // очищуємо контролери
            controls.forEach(id => {
                const el = document.getElementById(id);
                if (el.type === 'checkbox') el.checked = false;
                if (el.type === 'number') el.value = '';
            });
            document.querySelectorAll('#filterCategories input')
                .forEach(cb => cb.checked = false);
            applyFilters();
        });
}

// ---- підвантажити + відмалювати рецепти за фільтрами ----
async function initRecipeList() {
    const res = await fetch('/api/recipes');
    allRecipes = await res.json();
    applyFilters();
}

// ---- фільтрація + рендер ----
function applyFilters() {
    const listEl = document.getElementById('recipe-list');
    // зчитуємо стани
    const fEasy = document.getElementById('fEasy').checked;
    const fMed = document.getElementById('fMedium').checked;
    const fHard = document.getElementById('fHard').checked;
    const tMin = parseInt(document.getElementById('fTimeMin').value) || 0;
    const tMax = parseInt(document.getElementById('fTimeMax').value) || Infinity;
    const cMin = parseInt(document.getElementById('fCountMin').value) || 0;
    const cMax = parseInt(document.getElementById('fCountMax').value) || Infinity;
    const vegOnly = document.getElementById('fVegetarian').checked;
    const drkOnly = document.getElementById('fDrink').checked;
    const calMin = parseInt(document.getElementById('fCalMin').value) || 0;
    const calMax = parseInt(document.getElementById('fCalMax').value) || Infinity;
    const selCats = Array.from(
        document.querySelectorAll('#filterCategories input:checked')
    ).map(cb => parseInt(cb.value));

    // фільтруємо
    const filtered = allRecipes.filter(r => {
        // 1) складність (OR-логіка)
        if (fEasy || fMed || fHard) {
            if (r.complexityTag === 'Легка' && !fEasy) return false;
            if (r.complexityTag === 'Середня' && !fMed) return false;
            if (r.complexityTag === 'Складна' && !fHard) return false;
        }
        // 2) час
        if (r.preparationTime < tMin || r.preparationTime > tMax) return false;
        // 3) к-сть інгредієнтів
        if ((r.ingredientCount || 0) < cMin || (r.ingredientCount || 0) > cMax) return false;
        // 4) veg/drink
        if (vegOnly && !r.isVegetarian) return false;
        if (drkOnly && !r.isDrink) return false;
        // 5) калорії
        if ((r.calories || 0) < calMin || (r.calories || 0) > calMax) return false;
        // 6) категорії
        if (selCats.length) {
            const recCats = r.recipeCategories.map(rc => rc.categoryId);
            if (!selCats.some(c => recCats.includes(c))) return false;
        }
        return true;
    });

    // рендер
    listEl.innerHTML = '';
    if (!filtered.length) {
        listEl.innerHTML = '<p class="text-muted">Нічого не знайдено.</p>';
        return;
    }
    filtered.forEach(r => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
      <div class="card h-100">
        ${r.imageUrl ? `<img src="${r.imageUrl}" class="card-img-top">` : ``}
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${r.title}</h5>
          <p class="card-text mb-2">
            <small class="text-muted">
              ${r.complexityTag}, ${r.preparationTime} хв, ${r.calories || 0} ккал/100г
            </small>
          </p>
          <div class="mt-auto text-end">
            <a href="recipe-details.html?id=${r.id}"
               class="btn btn-sm btn-primary">Деталі</a>
          </div>
        </div>
      </div>`;
        listEl.appendChild(col);
    });
}

// ---------- 2) initListPage (categories.html / ingredients.html) ----------
function initListPage({ apiUrl, btnAddId, formId, inputId, submitId, containerId, placeholderSingular, itemKey, showCalories }) {
    const cards = document.getElementById(containerId);
    const searchInput = document.getElementById('search-input');
    const btnAdd = document.getElementById(btnAddId);
    const formAdd = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const submit = document.getElementById(submitId);

    async function loadItems(filter = '') {
        const res = await fetch(apiUrl);
        const list = await res.json();
        cards.innerHTML = '';
        list
            .filter(i => i.name.toLowerCase().includes(filter.toLowerCase()))
            .forEach(i => {
                const col = document.createElement('div');
                col.className = 'col-sm-6 col-md-4 col-lg-3';
                col.innerHTML = `
          <div class="card h-100">
            <div class="card-body d-flex flex-column justify-content-between">
              <h6 class="card-title mb-2">${i.name}</h6>
              ${showCalories
                        ? `<p class="mb-3 text-muted">${i.caloriesPer100g} ккал/100г</p>`
                        : ''
                    }
              <div class="mt-auto text-end">
                <button class="btn btn-sm btn-outline-secondary me-2 btn-edit" data-id="${i.id}">
                  ✏️
                </button>
                <button class="btn btn-sm btn-outline-danger btn-del" data-id="${i.id}">
                  🗑️
                </button>
              </div>
            </div>
          </div>`;
                cards.appendChild(col);
            });
    }

    searchInput?.addEventListener('input', e => loadItems(e.target.value));
    btnAdd.addEventListener('click', () => formAdd.classList.toggle('hidden'));
    submit.addEventListener('click', async () => {
        const value = input.value.trim();
        if (!value) return alert(`Введіть ${placeholderSingular}`);
        await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
                apiUrl.includes('ingredients')
                    ? { names: value }
                    : { name: value }
            )
        });
        input.value = '';
        await loadItems(searchInput?.value || '');
    });

    cards.addEventListener('click', async e => {
        const t = e.target;
        if (t.matches('.btn-del')) {
            if (!confirm('Видалити?')) return;
            await fetch(`${apiUrl}/${t.dataset.id}`, { method: 'DELETE' });
            await loadItems(searchInput?.value || '');
        }
        if (t.matches('.btn-edit')) {
            const id = t.dataset.id;
            const newVal = prompt('Нова назва:', '');
            if (newVal) {
                await fetch(`${apiUrl}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: +id, [itemKey]: newVal.trim() })
                });
                await loadItems(searchInput?.value || '');
            }
        }
    });

    loadItems();
}


// ---------- 3) initCreateRecipe (create-recipe.html) ----------
function initCreateRecipe() {
    const form = document.getElementById('recipe-form');
    const catContainer = document.getElementById('categories-list');
    const ingredientsList = document.getElementById('ingredients-list');
    const btnAdd = document.getElementById('btn-add-ingredient');
    const searchInput = document.getElementById('ingredient-search');
    let ingredientData = [];

    // завантажити та відрендерити категорії
    async function loadCategories() {
        const res = await fetch('/api/categories');
        const cats = await res.json();
        catContainer.innerHTML = cats.map(c => `
      <div class="col-sm-6 col-md-4 col-lg-3">
        <div class="d-inline-flex align-items-center p-2 mb-2 border rounded">
          <input type="hidden" name="CategoryIds" value="false" />
          <input type="checkbox"
                 name="CategoryIds"
                 value="true"
                 id="cat-${c.id}"
                 class="form-check-input me-2">
          <label for="cat-${c.id}" class="form-check-label mb-0">
            ${c.name}
          </label>
        </div>
      </div>
    `).join('');
    }

    // завантажити інгредієнти та перший рядок
    async function loadIngredients() {
        const res = await fetch('/api/ingredients');
        ingredientData = await res.json();
        addIngredientRow();
    }

    // паралельно запустити обидва
    Promise.all([loadCategories(), loadIngredients()])
        .catch(err => alert(err.message));

    // один рядок інгредієнту
    function addIngredientRow() {
        const idx = ingredientsList.children.length;
        const row = document.createElement('div');
        row.className = 'row align-items-center mb-2';
        row.innerHTML = `
      <div class="col-md-6">
        <select name="Ingredients[${idx}].IngredientId"
                class="form-select ingredient-select" required>
          <option value="">— оберіть інгредієнт —</option>
          ${ingredientData.map(i =>
            `<option value="${i.id}">${i.name} (${i.caloriesPer100g} ккал/100г)</option>`
        ).join('')}
        </select>
      </div>
      <div class="col-md-4">
        <input name="Ingredients[${idx}].WeightInGrams"
               type="number"
               class="form-control ingredient-weight"
               placeholder="грам"
               min="1"
               required>
      </div>
      <div class="col-md-2 text-end">
        <button type="button" class="btn btn-outline-danger btn-remove">×</button>
      </div>`;
        ingredientsList.appendChild(row);

        row.querySelector('.btn-remove')
            .addEventListener('click', () => row.remove());
        applyFilterToSelect(row.querySelector('.ingredient-select'));
    }

    btnAdd.addEventListener('click', addIngredientRow);

    function applyFilterToSelect(selectEl) {
        const term = searchInput.value.trim().toLowerCase();
        Array.from(selectEl.options).forEach(opt => {
            if (!opt.value) return;
            opt.hidden = !opt.textContent.toLowerCase().includes(term);
        });
    }
    searchInput.addEventListener('input', () => {
        document.querySelectorAll('.ingredient-select')
            .forEach(applyFilterToSelect);
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(form);
        const res = await fetch('/api/recipes', { method: 'POST', body: fd });
        if (res.ok) location.href = 'index.html';
        else alert('Помилка: ' + await res.text());
    });
}


// ---------- 4) initRecipeDetails (recipe-details.html) ----------
async function initRecipeDetails() {
    const detailContainer = document.getElementById('recipe-detail');
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) {
        detailContainer.innerHTML = '<p class="text-danger">Id не передано</p>';
        return;
    }

    const res = await fetch(`/api/recipes/${id}`);
    if (!res.ok) {
        detailContainer.innerHTML = '<p class="text-danger">Рецепт не знайдено</p>';
        return;
    }
    const r = await res.json();

    // Кнопки Редагувати/Видалити
    const btns = document.getElementById('action-buttons');
    btns.innerHTML = `
      <button id="btn-edit"   class="btn btn-sm btn-outline-primary me-2">Редагувати</button>
      <button id="btn-delete" class="btn btn-sm btn-outline-danger">Видалити</button>
    `;
    document.getElementById('btn-edit')
        .addEventListener('click', () => location.href = `recipe-edit.html?id=${r.id}`);
    document.getElementById('btn-delete')
        .addEventListener('click', async () => {
            if (confirm('Видалити рецепт?')) {
                await fetch(`/api/recipes/${r.id}`, { method: 'DELETE' });
                location.href = 'index.html';
            }
        });

    // Відображення деталей з лічильником інгредієнтів
    detailContainer.innerHTML = `
      <h1>${r.title}</h1>
      ${r.imageUrl ? `<img src="${r.imageUrl}" class="img-fluid mb-3">` : ''}
      <p><strong>Час приготування:</strong> ${r.preparationTime} хв</p>
      <p><strong>Складність:</strong> ${r.complexityTag}</p>
      <p><strong>Калорійність:</strong> ${r.calories} ккал/100г</p>
      <p><strong>Кількість інгредієнтів:</strong> ${r.ingredientCount}</p>
      <p><strong>Вегетаріанський:</strong> ${r.isVegetarian ? 'Так' : 'Ні'}</p>
      <p><strong>Напій:</strong> ${r.isDrink ? 'Так' : 'Ні'}</p>
      <p><strong>Категорії:</strong> ${r.recipeCategories.map(rc => rc.category.name).join(', ')}</p>
      <p><strong>Інгредієнти:</strong></p>
      <ul>
        ${r.recipeIngredients.map(
        ri => `<li>${ri.ingredient.name}: ${ri.weightInGrams} г</li>`
    ).join('')}
      </ul>
      <h3>Інструкції</h3>
      <p>${r.instructions}</p>
    `;
}


// ---------- 5) initEditRecipe (recipe-edit.html) ----------
async function initEditRecipe() {
    const form = document.getElementById('recipe-form-edit');
    const backLink = document.getElementById('back-to-detail');
    const catContainer = document.getElementById('categories-list');
    const ingredientsList = document.getElementById('ingredients-list');
    const btnAdd = document.getElementById('btn-add-ingredient');
    const searchInput = document.getElementById('ingredient-search');

    // 1) Витягуємо id з URL
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if (!id) {
        form.innerHTML = '<p class="text-danger">Id не передано</p>';
        return;
    }
    document.getElementById('recipeId').value = id;
    backLink.href = `recipe-details.html?id=${id}`;

    // 2) Паралельно завантажуємо: деталі рецепту, список категорій та інгредієнтів
    const [resCats, resIngs, resRec] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/ingredients'),
        fetch(`/api/recipes/${id}`)
    ]);
    const cats = await resCats.json();
    const ings = await resIngs.json();
    const r = await resRec.json();

    // 3) Рендеримо чекбокси категорій і відмічаємо ті, що вже є в r.recipeCategories
    catContainer.innerHTML = '';
    cats.forEach(c => {
        const isChecked = r.recipeCategories.some(rc => rc.categoryId === c.id);
        const wrapper = document.createElement('div');
        wrapper.className = 'col-sm-6 col-md-4 col-lg-3';
        wrapper.innerHTML = `
  <div class="d-inline-flex align-items-center p-2 mb-2 border rounded">
    <input
       type="checkbox"
       name="CategoryIds"
       value="${c.id}"
       id="cat-${c.id}"
       class="form-check-input me-2"
       ${isChecked ? 'checked' : ''}
    />
    <label for="cat-${c.id}" class="form-check-label mb-0">
      ${c.name}
    </label>
  </div>`;
        catContainer.appendChild(wrapper);
    });

    // 4) Заповнюємо прості поля
    form.title.value = r.title;
    form.instructions.value = r.instructions;
    form.prepTime.value = r.preparationTime;
    form.isVegetarian.checked = !!r.isVegetarian;
    form.isDrink.checked = !!r.isDrink;

    // 5) Підготуємо дані інгредієнтів й одразу відрендеримо всі наявні рядки
    let ingredientData = ings;
    // спочатку очистимо
    ingredientsList.innerHTML = '';
    // функція додавання рядка — скопіюйте з initCreateRecipe
    function addRow(ri) {
        const idx = ingredientsList.children.length;
        const row = document.createElement('div');
        row.className = 'row align-items-center mb-2';
        row.innerHTML = `
      <div class="col-md-6">
        <select name="Ingredients[${idx}].IngredientId"
                class="form-select ingredient-select" required>
          <option value="">— оберіть інгредієнт —</option>
          ${ingredientData.map(i =>
            `<option value="${i.id}"
              ${ri && ri.ingredientId === i.id ? 'selected' : ''}>
               ${i.name} (${i.caloriesPer100g} ккал/100г)
            </option>`
        ).join('')}
        </select>
      </div>
      <div class="col-md-4">
        <input name="Ingredients[${idx}].WeightInGrams"
               type="number"
               class="form-control ingredient-weight"
               placeholder="грам"
               min="1"
               required
               value="${ri ? ri.weightInGrams : ''}">
      </div>
      <div class="col-md-2 text-end">
        <button type="button" class="btn btn-outline-danger btn-remove">×</button>
      </div>`;
        ingredientsList.appendChild(row);

        row.querySelector('.btn-remove')
            .addEventListener('click', () => row.remove());
        applyFilterToSelect(row.querySelector('.ingredient-select'));
    }

    // застосовуємо фільтр
    function applyFilterToSelect(selectEl) {
        const term = searchInput.value.trim().toLowerCase();
        Array.from(selectEl.options).forEach(opt => {
            if (!opt.value) return;
            opt.hidden = !opt.textContent.toLowerCase().includes(term);
        });
    }
    searchInput.addEventListener('input', () => {
        document.querySelectorAll('.ingredient-select').forEach(applyFilterToSelect);
    });

    // відрендерити існуючі звʼязки
    r.recipeIngredients.forEach(ri => addRow({
        ingredientId: ri.ingredientId,
        weightInGrams: ri.weightInGrams
    }));

    // кнопка «додати рядок»
    btnAdd.addEventListener('click', () => addRow(null));

    // 6) Сабміт — надсилаємо PUT із FormData
    form.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            // 1) Зчитаємо Id рецепту з прихованого поля
            const recipeId = document.getElementById('recipeId').value;
            console.log('Saving recipe id:', recipeId);

            // 2) Формуємо FormData
            const fd = new FormData();

            // Обов’язково додаємо Id, щоб сервер коректно зіставив DTO
            fd.append('Id', recipeId);

            // Тепер всі інші поля
            fd.append('Title', form.title.value.trim());
            fd.append('Instructions', form.instructions.value.trim());
            fd.append('PreparationTime', form.prepTime.value);

            if (form.isVegetarian.checked) fd.append('IsVegetarian', 'true');
            if (form.isDrink.checked) fd.append('IsDrink', 'true');

            // Категорії — додаємо всі обрані
            document
                .querySelectorAll('#categories-list input[name="CategoryIds"]:checked')
                .forEach(cb => fd.append('CategoryIds', cb.value));

            // Фото — додаємо лише якщо обрали файл
            const fileInput = document.getElementById('imageFile');
            const file = fileInput.files[0];
            if (file) fd.append('imageFile', file);

            // Інгредієнти — кожен рядок
            document.querySelectorAll('#ingredients-list .row').forEach((row, i) => {
                const sel = row.querySelector('.ingredient-select');
                const weight = row.querySelector('input[name^="Ingredients"][name$=".WeightInGrams"]');
                fd.append(`Ingredients[${i}].IngredientId`, sel.value);
                fd.append(`Ingredients[${i}].WeightInGrams`, weight.value);
            });

            // 3) Відправляємо PUT
            const res = await fetch(`/api/recipes/${recipeId}`, {
                method: 'PUT',
                body: fd
            });
            console.log('Server response status:', res.status);

            // 4) Обробляємо результат
            if (res.ok) {
                // Повертаємося на сторінку деталей
                window.location.href = `recipe-details.html?id=${recipeId}`;
            } else {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

        } catch (err) {
            console.error('Error saving recipe:', err);
            alert('Помилка при збереженні рецепту. Деталі в консолі.');
        }
    });

}
