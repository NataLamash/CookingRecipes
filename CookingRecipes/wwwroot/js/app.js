document.addEventListener('DOMContentLoaded', main);

let allRecipes = [];
let allCategories = [];
let ingredientDataGlobal = [];
let recipeDataGlobal = null;
const apiBaseUrl = 'http://localhost:5001/api'; // Визначаємо базовий URL тут

// Змінні стану пагінації
let currentPage = 1;
const recipesPerPage = 6;
let isLoadingRecipes = false;
let allRecipesLoaded = false;
let currentLoadMoreButton = null;

async function main() {
    if (document.getElementById('cards-container') && (document.getElementById('btn-add-category') || document.getElementById('btn-add-ingredient'))) {
        const isIngredientPage = !!document.getElementById('btn-add-ingredient');
        initListPage({
            apiUrl: isIngredientPage ? `${apiBaseUrl}/ingredients` : `${apiBaseUrl}/categories`,
            btnAddId: isIngredientPage ? 'btn-add-ingredient' : 'btn-add-category',
            formId: 'form-add',
            inputId: isIngredientPage ? 'new-names' : 'new-name',
            submitId: 'submit-add',
            containerId: 'cards-container',
            placeholderSingular: isIngredientPage ? 'назва - калорії (через кому)' : 'назву категорії',
            itemKey: isIngredientPage ? 'caloriesPer100g' : 'name',
            showCalories: isIngredientPage,
            apiBaseUrl: apiBaseUrl
        });
        return;
    }

    if (document.getElementById('recipe-form')) {
        initCreateRecipe({ apiBaseUrl });
        return;
    }

    if (document.getElementById('recipe-form-edit')) {
        initEditRecipe({ apiBaseUrl });
        return;
    }

    if (document.getElementById('recipe-detail')) {
        initRecipeDetails({ apiBaseUrl });
        return;
    }

    if (document.getElementById('recipe-list') && document.getElementById('filterAccordion')) {
        await initRecipeFilters({ apiBaseUrl });
        await initRecipeList({ apiBaseUrl });
        return;
    }
}

function initListPage({
    apiUrl, btnAddId, formId, inputId, submitId,
    containerId, placeholderSingular, showCalories, apiBaseUrl
}) {
    const cardsContainer = document.getElementById(containerId);
    const searchInput = document.getElementById('search-input');
    const btnAdd = document.getElementById(btnAddId);
    const formAdd = document.getElementById(formId);
    const nameInput = document.getElementById(inputId);
    const submitButton = document.getElementById(submitId);

    if (!cardsContainer || !btnAdd || !formAdd || !nameInput || !submitButton) {
        console.error('ListPage: Один або більше основних елементів не знайдено на сторінці.');
        return;
    }

    async function loadItems(filter = '') {
        try {
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error(`Не вдалося завантажити дані з ${apiUrl}`);
            const list = await res.json();
            cardsContainer.innerHTML = '';

            list
                .filter(item => item.name.toLowerCase().includes(filter.toLowerCase()))
                .forEach(item => {
                    const col = document.createElement('div');
                    col.className = 'col-sm-6 col-md-4 col-lg-3 mb-4';
                    let caloriesHtml = '';
                    if (showCalories && typeof item.caloriesPer100g !== 'undefined') {
                        caloriesHtml = `<p class="mb-2 text-muted-custom"><i class="bi bi-fire me-1"></i>${item.caloriesPer100g} ккал/100г</p>`;
                    }
                    col.innerHTML = `
                        <div class="card h-100 card-item-custom">
                          <div class="card-body d-flex flex-column justify-content-between">
                            <div>
                                <h6 class="card-title mb-2">${item.name}</h6>
                                ${caloriesHtml}
                            </div>
                            <div class="mt-auto text-end">
                              <button class="btn btn-sm btn-edit" data-id="${item.id}" aria-label="Редагувати"><i class="bi bi-pencil-fill"></i></button>
                              <button class="btn btn-sm btn-del" data-id="${item.id}" aria-label="Видалити"><i class="bi bi-trash3-fill"></i></button>
                            </div>
                          </div>
                        </div>`;
                    cardsContainer.appendChild(col);
                });
            attachListEvents();
        } catch (error) {
            console.error("Помилка завантаження списку:", error);
            if (cardsContainer) cardsContainer.innerHTML = `<p class="text-danger text-center col-12">Не вдалося завантажити дані. ${error.message}</p>`;
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => loadItems(searchInput.value));
    }

    btnAdd.addEventListener('click', () => formAdd.classList.toggle('hidden'));

    submitButton.addEventListener('click', async () => {
        const value = nameInput.value.trim();
        if (!value) {
            alert(`Будь ласка, введіть ${placeholderSingular}.`);
            return;
        }
        const payload = apiUrl.includes('ingredients')
            ? { names: value }
            : { name: value };
        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                let errorMessage = `Не вдалося додати елемент. Статус: ${res.status}`;
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    try {
                        const errorData = await res.json();
                        errorMessage = errorData.message || errorData.title || JSON.stringify(errorData);
                    } catch (e) {
                        errorMessage = await res.text();
                    }
                } else {
                    const errorText = await res.text();
                    if (errorText) {
                        errorMessage = errorText;
                        const match = errorText.match(/<title>(.*?)<\/title>/i);
                        if (match && match[1]) {
                            errorMessage = match[1];
                        }
                    }
                }
                throw new Error(errorMessage);
            }

            nameInput.value = '';
            formAdd.classList.add('hidden');
            loadItems(searchInput ? searchInput.value : '');

        } catch (error) {
            console.error("Помилка додавання елемента:", error);
            alert(`Помилка додавання: ${error.message}`);
        }
    });

    function attachListEvents() {
        if (!cardsContainer) return;
        cardsContainer.querySelectorAll('.btn-del').forEach(btn => {
            btn.onclick = async () => {
                if (!confirm('Ви впевнені, що хочете видалити цей елемент?')) return;
                try {
                    const res = await fetch(`${apiUrl}/${btn.dataset.id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Не вдалося видалити елемент.');
                    loadItems(searchInput ? searchInput.value : '');
                } catch (error) {
                    console.error("Помилка видалення:", error);
                    alert(`Помилка видалення: ${error.message}`);
                }
            };
        });

        cardsContainer.querySelectorAll('.btn-edit').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const cardBody = btn.closest('.card-body');
                if (!cardBody) return;
                const titleEl = cardBody.querySelector('.card-title');
                if (!titleEl) return;
                const originalTitleText = titleEl.textContent;
                const calEl = showCalories ? cardBody.querySelector('.text-muted-custom') : null;
                const originalCalText = calEl ? calEl.textContent : '';

                const currentNameInput = document.createElement('input');
                currentNameInput.type = 'text';
                currentNameInput.value = originalTitleText;
                currentNameInput.className = 'form-control form-control-sm mb-2';

                let currentCalInput;
                if (showCalories && calEl) {
                    currentCalInput = document.createElement('input');
                    currentCalInput.type = 'number';
                    currentCalInput.min = 0;
                    currentCalInput.value = parseInt(originalCalText.replace(/\D/g, '')) || 0;
                    currentCalInput.className = 'form-control form-control-sm mb-2';
                }

                titleEl.replaceWith(currentNameInput);
                if (currentCalInput && calEl) calEl.replaceWith(currentCalInput);

                btn.style.display = 'none';
                const delBtn = cardBody.querySelector('.btn-del');
                if (delBtn) delBtn.style.display = 'none';

                const saveBtn = document.createElement('button');
                saveBtn.className = 'btn btn-sm btn-success-custom me-2';
                saveBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn btn-sm btn-secondary-custom';
                cancelBtn.innerHTML = '<i class="bi bi-x-lg"></i>';

                const footer = cardBody.querySelector('.mt-auto.text-end');
                if (footer) {
                    footer.prepend(cancelBtn);
                    footer.prepend(saveBtn);
                }

                saveBtn.onclick = async () => {
                    const newName = currentNameInput.value.trim();
                    if (!newName) {
                        alert('Назва не може бути порожньою.');
                        return;
                    }
                    const bodyToUpdate = { id: +id, name: newName };
                    if (showCalories && currentCalInput) {
                        const newCal = parseInt(currentCalInput.value);
                        if (isNaN(newCal) || newCal < 0) {
                            alert('Будь ласка, введіть коректне значення калорій (невід\'ємне число).');
                            return;
                        }
                        bodyToUpdate.caloriesPer100g = newCal;
                    }
                    try {
                        const res = await fetch(`${apiUrl}/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(bodyToUpdate)
                        });
                        if (!res.ok) throw new Error('Не вдалося оновити елемент.');

                        const newTitleEl = document.createElement('h6');
                        newTitleEl.className = 'card-title mb-2';
                        newTitleEl.textContent = newName;
                        currentNameInput.replaceWith(newTitleEl);

                        if (showCalories && currentCalInput) {
                            const newCalEl = document.createElement('p');
                            newCalEl.className = 'mb-2 text-muted-custom';
                            if (bodyToUpdate.caloriesPer100g !== undefined) {
                                newCalEl.innerHTML = `<i class="bi bi-fire me-1"></i>${bodyToUpdate.caloriesPer100g} ккал/100г`;
                            }
                            currentCalInput.replaceWith(newCalEl);
                        }
                        saveBtn.remove();
                        cancelBtn.remove();
                        btn.style.display = '';
                        if (delBtn) delBtn.style.display = '';
                    } catch (error) {
                        console.error("Помилка оновлення:", error);
                        alert(`Помилка оновлення: ${error.message}`);
                    }
                };

                cancelBtn.onclick = () => {
                    const restoredTitleEl = document.createElement('h6');
                    restoredTitleEl.className = 'card-title mb-2';
                    restoredTitleEl.textContent = originalTitleText;
                    currentNameInput.replaceWith(restoredTitleEl);

                    if (showCalories && currentCalInput && calEl) {
                        const restoredCalEl = document.createElement('p');
                        restoredCalEl.className = 'mb-2 text-muted-custom';
                        restoredCalEl.innerHTML = originalCalText.includes('ккал/100г') && !originalCalText.includes('bi-fire') ? `<i class="bi bi-fire me-1"></i>${originalCalText}` : originalCalText;
                        currentCalInput.replaceWith(restoredCalEl);
                    }
                    saveBtn.remove();
                    cancelBtn.remove();
                    btn.style.display = '';
                    if (delBtn) delBtn.style.display = '';
                };
            };
        });
    }
    if (cardsContainer) loadItems();
}

function initCreateRecipe({ apiBaseUrl }) {
    const form = document.getElementById('recipe-form');
    if (!form) return;
    const catContainer = document.getElementById('categories-list');
    const ingredientsListEl = document.getElementById('ingredients-list');
    const btnAddIngredient = document.getElementById('btn-add-ingredient');
    const ingredientSearchInput = document.getElementById('ingredient-search');

    async function loadCategoriesForForm() {
        if (!catContainer) return;
        try {
            const res = await fetch(`${apiBaseUrl}/categories`);
            if (!res.ok) throw new Error('Не вдалося завантажити категорії');
            const cats = await res.json();
            catContainer.innerHTML = cats.map(c => `
              <div class="col-sm-6 col-md-4 col-lg-3">
                <div class="form-check">
                  <input type="checkbox" name="CategoryIds" value="${c.id}"
                         id="form-cat-${c.id}" class="form-check-input form-check-input-custom">
                  <label for="form-cat-${c.id}" class="form-check-label form-check-label-custom">${c.name}</label>
                </div>
              </div>
            `).join('');
        } catch (error) {
            console.error("Помилка завантаження категорій для форми:", error);
            catContainer.innerHTML = `<p class="text-danger col-12">Не вдалося завантажити категорії. ${error.message}</p>`;
        }
    }

    async function loadIngredientsForForm() {
        try {
            const res = await fetch(`${apiBaseUrl}/ingredients`);
            if (!res.ok) throw new Error('Не вдалося завантажити інгредієнти');
            ingredientDataGlobal = await res.json();
            if (ingredientsListEl && ingredientsListEl.children.length === 0) {
                addIngredientRowToForm();
            }
        } catch (error) {
            console.error("Помилка завантаження інгредієнтів для форми:", error);
        }
    }

    Promise.all([loadCategoriesForForm(), loadIngredientsForForm()]);

    function addIngredientRowToForm() {
        if (!ingredientsListEl) return;
        const idx = ingredientsListEl.children.length;
        const row = document.createElement('div');
        row.className = 'row align-items-center mb-2 ingredient-row-custom';
        row.innerHTML = `
          <div class="col-md-5">
            <select name="Ingredients[${idx}].IngredientId" class="form-select ingredient-select" required>
              <option value="">— оберіть інгредієнт —</option>
              ${ingredientDataGlobal.map(i =>
            `<option value="${i.id}">${i.name} (${i.caloriesPer100g || 0} ккал/100г)</option>`
        ).join('')}
            </select>
          </div>
          <div class="col-md-4">
            <input name="Ingredients[${idx}].WeightInGrams" type="number"
                   class="form-control ingredient-weight" placeholder="грам" min="1" required>
          </div>
          <div class="col-md-2 text-end">
            <button type="button" class="btn btn-outline-pink-custom btn-sm btn-remove-ingredient" aria-label="Видалити інгредієнт"><i class="bi bi-x-lg"></i></button>
          </div>
        `;
        ingredientsListEl.appendChild(row);

        row.querySelector('.btn-remove-ingredient').addEventListener('click', () => row.remove());
        if (ingredientSearchInput) {
            applyFilterToSelect(row.querySelector('.ingredient-select'), ingredientSearchInput.value);
        }
    }
    if (btnAddIngredient) {
        btnAddIngredient.addEventListener('click', addIngredientRowToForm);
    }

    if (ingredientSearchInput && ingredientsListEl) {
        if (ingredientSearchInput.placeholder && ingredientSearchInput.placeholder.includes(',')) {
            ingredientSearchInput.placeholder = "Пошук інгредієнту…";
        }
        ingredientSearchInput.addEventListener('input', () => {
            const term = ingredientSearchInput.value;
            ingredientsListEl.querySelectorAll('.ingredient-select').forEach(sel => applyFilterToSelect(sel, term));
        });
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(form);

        const isVegetarian = form.querySelector('#isVegetarian')?.checked || false;
        const isDrink = form.querySelector('#isDrink')?.checked || false;

        fd.set('IsVegetarian', isVegetarian.toString());
        fd.set('IsDrink', isDrink.toString());

        const categoryIds = [];
        form.querySelectorAll('input[name="CategoryIds"]:checked').forEach(checkbox => {
            categoryIds.push(checkbox.value);
        });
        fd.delete('CategoryIds');
        categoryIds.forEach(id => fd.append('CategoryIds', id));

        const prepTimeValue = form.querySelector('#prepTime') ? form.querySelector('#prepTime').value : '0';
        if (parseInt(prepTimeValue) < 0) {
            alert("Час приготування не може бути від'ємним.");
            return;
        }

        if (ingredientsListEl && ingredientsListEl.children.length === 0) {
            alert('Будь ласка, додайте хоча б один інгредієнт.');
            return;
        }
        try {
            const res = await fetch(`${apiBaseUrl}/recipes`, { method: 'POST', body: fd });
            if (res.ok) {
                alert('Рецепт успішно створено!');
                location.href = 'index.html';
            } else {
                const errorText = await res.text();
                console.error('Помилка створення рецепту:', errorText);
                alert('Помилка створення рецепту: ' + errorText);
            }
        } catch (error) {
            console.error("Мережева або інша помилка при створенні рецепту:", error);
            alert('Не вдалося створити рецепт. Перевірте з\'єднання або дані форми.');
        }
    });
}

async function initEditRecipe({ apiBaseUrl }) {
    const form = document.getElementById('recipe-form-edit');
    if (!form) return;
    const params = new URLSearchParams(location.search);
    const recipeId = params.get('id');
    const backToDetailLink = document.getElementById('back-to-detail');

    if (backToDetailLink && recipeId) {
        backToDetailLink.href = `recipe-details.html?id=${recipeId}`;
    } else if (backToDetailLink) {
        backToDetailLink.href = 'index.html';
    }

    if (!recipeId) {
        alert('ID рецепту не вказано для редагування.');
        location.href = 'index.html';
        return;
    }
    const recipeIdField = form.querySelector('#recipeId');
    if (recipeIdField) recipeIdField.value = recipeId;

    try {
        const recipeRes = await fetch(`${apiBaseUrl}/recipes/${recipeId}`);
        if (!recipeRes.ok) throw new Error('Не вдалося завантажити дані рецепту для редагування.');
        const recipeData = await recipeRes.json();
        recipeDataGlobal = recipeData;

        const titleEl = form.querySelector('#title');
        if (titleEl) titleEl.value = recipeData.title;
        const prepTimeEl = form.querySelector('#prepTime');
        if (prepTimeEl) prepTimeEl.value = recipeData.preparationTime;

        const instructionsEl = form.querySelector('#instructions');
        if (instructionsEl) instructionsEl.value = recipeData.instructions;
        const isVegEl = form.querySelector('#isVegetarian');
        if (isVegEl) isVegEl.checked = recipeData.isVegetarian;
        const isDrinkEl = form.querySelector('#isDrink');
        if (isDrinkEl) isDrinkEl.checked = recipeData.isDrink;

        const catContainer = form.querySelector('#categories-list');
        if (catContainer) {
            const allCatsRes = await fetch(`${apiBaseUrl}/categories`);
            if (!allCatsRes.ok) throw new Error('Не вдалося завантажити категорії для форми редагування');
            const allCats = await allCatsRes.json();
            catContainer.innerHTML = allCats.map(c => `
                <div class="form-check col-sm-6 col-md-4 col-lg-3">
                  <input type="checkbox" name="CategoryIds" value="${c.id}"
                         id="edit-form-cat-${c.id}" class="form-check-input form-check-input-custom"
                         ${recipeData.recipeCategories.some(rc => rc.categoryId === c.id) ? 'checked' : ''}>
                  <label for="edit-form-cat-${c.id}" class="form-check-label form-check-label-custom">${c.name}</label>
                </div>
            `).join('');
        }

        const ingredientsListEditEl = form.querySelector('#ingredients-list');
        if (ingredientsListEditEl) {
            const allIngredientsRes = await fetch(`${apiBaseUrl}/ingredients`);
            if (!allIngredientsRes.ok) throw new Error('Не вдалося завантажити інгредієнти для форми редагування');
            ingredientDataGlobal = await allIngredientsRes.json();

            ingredientsListEditEl.innerHTML = '';
            recipeData.recipeIngredients.forEach((ri, idx) => {
                addIngredientRowToFormForEdit(ri, idx, ingredientsListEditEl);
            });
        }

        const btnAddIngredientEdit = form.querySelector('#btn-add-ingredient');
        if (btnAddIngredientEdit && ingredientsListEditEl) {
            btnAddIngredientEdit.addEventListener('click', () => addIngredientRowToFormForEdit(null, ingredientsListEditEl.children.length, ingredientsListEditEl));
        }
        const ingredientSearchInputEdit = form.querySelector('#ingredient-search');
        if (ingredientSearchInputEdit && ingredientsListEditEl) {
            if (ingredientSearchInputEdit.placeholder && ingredientSearchInputEdit.placeholder.includes(',')) {
                ingredientSearchInputEdit.placeholder = "Пошук інгредієнту…";
            }
            ingredientSearchInputEdit.addEventListener('input', () => {
                const term = ingredientSearchInputEdit.value;
                ingredientsListEditEl.querySelectorAll('.ingredient-select').forEach(sel => applyFilterToSelect(sel, term));
            });
        }

    } catch (error) {
        console.error("Помилка при ініціалізації редагування рецепту:", error);
        alert("Не вдалося завантажити дані для редагування: " + error.message);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);

        const isVegetarian = form.querySelector('#isVegetarian')?.checked || false;
        const isDrink = form.querySelector('#isDrink')?.checked || false;

        fd.set('Id', recipeId.toString());
        fd.set('IsVegetarian', isVegetarian.toString());
        fd.set('IsDrink', isDrink.toString());

        const categoryIds = [];
        form.querySelectorAll('input[name="CategoryIds"]:checked').forEach(checkbox => {
            categoryIds.push(checkbox.value);
        });
        fd.delete('CategoryIds');
        categoryIds.forEach(id => fd.append('CategoryIds', id));

        try {
            const res = await fetch(`${apiBaseUrl}/recipes/${recipeId}`, {
                method: 'PUT',
                body: fd
            });

            if (!res.ok) {
                let errorMessage = `Помилка оновлення. Статус: ${res.status}`;
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    try {
                        const errorData = await res.json();
                        errorMessage = errorData.message || errorData.title || JSON.stringify(errorData);
                    } catch (e) {
                        errorMessage = await res.text();
                    }
                } else {
                    const errorText = await res.text();
                    if (errorText) {
                        errorMessage = errorText;
                        const match = errorText.match(/<title>(.*?)<\/title>/i);
                        if (match && match[1]) {
                            errorMessage = match[1];
                        }
                    }
                }
                throw new Error(errorMessage);
            }

            alert('Рецепт успішно оновлено!');
            location.href = `recipe-details.html?id=${recipeId}`;

        } catch (error) {
            console.error('Помилка оновлення рецепту:', error.message, error);
            alert('Помилка оновлення рецепту: ' + error.message);
        }
    });
}

function addIngredientRowToFormForEdit(recipeIngredient, index, container) {
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'row align-items-center mb-2 ingredient-row-custom';
    const selectedIngredientId = recipeIngredient ? recipeIngredient.ingredientId : '';
    const weight = recipeIngredient ? recipeIngredient.weightInGrams : '';
    const recipeIngredientRecordId = recipeIngredient ? recipeIngredient.id : '';

    row.innerHTML = `
      ${recipeIngredientRecordId ? `<input type="hidden" name="Ingredients[${index}].RecipeIngredientId" value="${recipeIngredientRecordId}">` : ''}
      <div class="col-md-5">
        <select name="Ingredients[${index}].IngredientId" class="form-select ingredient-select" required>
          <option value="">— оберіть інгредієнт —</option>
          ${ingredientDataGlobal.map(i =>
        `<option value="${i.id}" ${i.id === selectedIngredientId ? 'selected' : ''}>${i.name} (${i.caloriesPer100g || 0} ккал/100г)</option>`
    ).join('')}
        </select>
      </div>
      <div class="col-md-4">
        <input name="Ingredients[${index}].WeightInGrams" type="number" value="${weight}"
               class="form-control ingredient-weight" placeholder="грам" min="1" required>
      </div>
      <div class="col-md-2 text-end">
        <button type="button" class="btn btn-outline-pink-custom btn-sm btn-remove-ingredient" aria-label="Видалити інгредієнт"><i class="bi bi-x-lg"></i></button>
      </div>
    `;
    container.appendChild(row);
    row.querySelector('.btn-remove-ingredient').addEventListener('click', () => row.remove());

    const ingredientSearchInputEdit = document.getElementById('ingredient-search');
    if (ingredientSearchInputEdit) {
        applyFilterToSelect(row.querySelector('.ingredient-select'), ingredientSearchInputEdit.value);
    }
}
function applyFilterToSelect(selectEl, term) {
    if (!selectEl) return;
    const filterTerm = (term || "").trim().toLowerCase();
    Array.from(selectEl.options).forEach(opt => {
        if (!opt.value) return;
        opt.hidden = !opt.textContent.toLowerCase().includes(filterTerm);
    });
    if (selectEl.options[selectEl.selectedIndex] && selectEl.options[selectEl.selectedIndex].hidden) {
        selectEl.value = "";
    }
}

async function initRecipeDetails({ apiBaseUrl }) {
    const detailContainer = document.getElementById('recipe-detail');
    if (!detailContainer) {
        console.error("Контейнер 'recipe-detail' не знайдено.");
        return;
    }

    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    if (!id) {
        detailContainer.innerHTML = '<div class="alert alert-danger text-center">ID рецепту не передано.</div>';
        return;
    }

    try {
        const res = await fetch(`${apiBaseUrl}/recipes/${id}`);
        if (!res.ok) {
            detailContainer.innerHTML = `<div class="alert alert-danger text-center">Рецепт не знайдено (код: ${res.status}).</div>`;
            return;
        }
        const r = await res.json();
        recipeDataGlobal = r;

        const actionButtonsContainer = document.getElementById('action-buttons');
        if (actionButtonsContainer) {
            actionButtonsContainer.innerHTML = `
              <a href="recipe-edit.html?id=${r.id}" class="btn btn-primary-custom btn-sm me-2"><i class="bi bi-pencil-square me-1"></i> Редагувати</a>
              <button id="btn-delete-recipe-detail" class="btn btn-outline-pink-custom btn-sm"><i class="bi bi-trash3-fill me-1"></i> Видалити</button>
            `;
            const deleteButton = document.getElementById('btn-delete-recipe-detail');
            if (deleteButton) {
                deleteButton.addEventListener('click', async () => {
                    if (confirm('Ви дійсно хочете видалити цей рецепт?')) {
                        try {
                            const deleteRes = await fetch(`${apiBaseUrl}/recipes/${r.id}`, { method: 'DELETE' });
                            if (deleteRes.ok) {
                                alert('Рецепт успішно видалено.');
                                window.location.href = 'index.html';
                            } else {
                                alert('Не вдалося видалити рецепт: ' + (await deleteRes.text()));
                            }
                        } catch (err) {
                            alert('Помилка при видаленні: ' + err.message);
                        }
                    }
                });
            }
        }

        let categoriesHtml = '';
        if (r.recipeCategories && r.recipeCategories.length > 0) {
            const catColors = ['bg-cat-1', 'bg-cat-2', 'bg-cat-3', 'bg-cat-4', 'bg-cat-default'];
            categoriesHtml = r.recipeCategories.map((rc, index) =>
                `<span class="badge ${catColors[index % catColors.length]}">${rc.categoryName || rc.category.name}</span>` // Додав перевірку на rc.category.name
            ).join('');
        } else {
            categoriesHtml = '<span class="text-muted-custom">Не вказано</span>';
        }

        let detailsHtml = `
            <div class="recipe-detail-card">
                <h2 class="text-center mb-3 section-title-custom" style="font-size: 2.2rem;">${r.title}</h2>
                <div class="row mb-4">
                    <div class="col-md-6 text-center mb-3 mb-md-0">
                        ${r.imageUrl ? `<img src="${r.imageUrl}" alt="${r.title}" class="recipe-detail-image">` : '<div class="recipe-detail-image-placeholder">Немає фото</div>'}
                    </div>
                    <div class="col-md-6 recipe-stats-block">
                        <div class="recipe-stat"><i class="bi bi-clock-history"></i><strong>Час:</strong> ${r.preparationTime} хв</div>
                        <div class="recipe-stat"><i class="bi bi-bar-chart-line"></i><strong>Складність:</strong> ${r.complexityTag}</div>
                        <div class="recipe-stat"><i class="bi bi-fire"></i><strong>Калорії:</strong> ${r.calories || 0} ккал/100г</div>
                        <div class="recipe-stat"><i class="bi bi-basket3"></i><strong>Інгредієнти:</strong> ${r.ingredientCount || 0} шт.</div>
                        <div class="recipe-stat mt-3 badges-container">
                            ${r.isVegetarian ? `<span class="badge bg-success-custom me-1"><i class="bi bi-leaf me-1"></i>Вегетаріанське</span>` : ''}
                            ${r.isDrink ? `<span class="badge bg-info-custom">Напій</span>` : ''}
                        </div>
                        <div class="mt-3 recipe-categories-tags">
                             <strong style="font-weight:600; color: var(--text-headings);">Категорії:</strong> ${categoriesHtml}
                        </div>
                    </div>
                </div>

                <h3 class="details-section-title"><i class="bi bi-list-stars me-2"></i>Інгредієнти</h3>
                <ul class="list-group list-group-flush mb-3">
                     ${r.recipeIngredients && r.recipeIngredients.length > 0 ? r.recipeIngredients.map(ri => `<li class="list-group-item list-group-item-custom">${ri.ingredientName || ri.ingredient.name}: <strong>${ri.weightInGrams} г</strong></li>`).join('') : '<li class="list-group-item list-group-item-custom">Не вказано</li>'}
                </ul>

                <h3 class="details-section-title"><i class="bi bi-text-left me-2"></i>Інструкції</h3>
                <div class="mt-2 lh-lg instructions-text">
                    ${r.instructions ? r.instructions.replace(/\n/g, '<br>') : 'Інструкції відсутні.'}
                </div>
            </div>
        `;
        detailContainer.innerHTML = detailsHtml;

    } catch (err) {
        console.error("Помилка завантаження деталей рецепту:", err);
        detailContainer.innerHTML = `<div class="alert alert-danger text-center">Помилка завантаження деталей рецепту: ${err.message}</div>`;
    }
}

async function initRecipeFilters({ apiBaseUrl }) {
    const filterCategoriesContainer = document.getElementById('filterCategories');
    if (!filterCategoriesContainer) return;
    try {
        const catRes = await fetch(`${apiBaseUrl}/categories`);
        if (!catRes.ok) throw new Error('Не вдалося завантажити категорії для фільтрів');
        allCategories = await catRes.json();
        filterCategoriesContainer.innerHTML = allCategories.map(c => `
          <div class="form-check col-sm-6 col-md-4 col-lg-3">
            <input class="form-check-input form-check-input-custom" type="checkbox" id="fCat${c.id}" value="${c.id}">
            <label class="form-check-label form-check-label-custom" for="fCat${c.id}">${c.name}</label>
          </div>
        `).join('');
        document.querySelectorAll('#filterCategories input[type="checkbox"]')
            .forEach(cb => cb.addEventListener('change', () => window.applyFiltersWithPagination({ apiBaseUrl })));

    } catch (error) {
        console.error("Помилка завантаження категорій для фільтрів:", error);
        filterCategoriesContainer.innerHTML = `<p class="text-danger col-12">Не вдалося завантажити категорії. ${error.message}</p>`;
    }

    const btnReset = document.getElementById('btn-reset-filters');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            ['fEasy', 'fMedium', 'fHard',
                'fTimeMin', 'fTimeMax',
                'fCountMin', 'fCountMax',
                'fVegetarian', 'fDrink',
                'fCalMin', 'fCalMax']
                .forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (el.type === 'checkbox') el.checked = false;
                    if (el.type === 'number' || el.type === 'text') el.value = '';
                });
            if (filterCategoriesContainer) {
                filterCategoriesContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            }
            window.applyFiltersWithPagination({ apiBaseUrl });
        });
    }

    const filterInputs = ['fEasy', 'fMedium', 'fHard',
        'fTimeMin', 'fTimeMax',
        'fCountMin', 'fCountMax',
        'fVegetarian', 'fDrink',
        'fCalMin', 'fCalMax'];

    filterInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const eventType = (el.type === 'checkbox' || el.type === 'radio') ? 'change' : 'input';
            el.addEventListener(eventType, () => window.applyFiltersWithPagination({ apiBaseUrl }));
        }
    });
}

async function initRecipeList({ apiBaseUrl }) {
    const recipeListContainer = document.getElementById('recipe-list');
    const loadMoreButtonContainer = document.getElementById('load-more-button-container');

    if (!recipeListContainer || !loadMoreButtonContainer) {
        console.error("Необхідні контейнери для списку рецептів або кнопки 'Завантажити ще' не знайдені.");
        return;
    }

    const loadMoreButton = document.createElement('button');
    loadMoreButton.id = 'btn-load-more-recipes';
    loadMoreButton.className = 'btn btn-primary-custom mt-4';
    loadMoreButton.innerHTML = '<i class="bi bi-arrow-down-circle-fill me-2"></i> Завантажити ще';
    loadMoreButton.style.display = 'none';
    currentLoadMoreButton = loadMoreButton;
    loadMoreButtonContainer.appendChild(currentLoadMoreButton);

    currentLoadMoreButton.addEventListener('click', async () => {
        if (isLoadingRecipes || allRecipesLoaded) return;
        currentPage++;
        await window.loadAndDisplayRecipes(false, apiBaseUrl);
    });

    window.loadAndDisplayRecipes = async function (clearContainer = true, currentApiBaseUrl = apiBaseUrl) {
        if (isLoadingRecipes && !clearContainer) return;
        isLoadingRecipes = true;
        if (currentLoadMoreButton) {
            currentLoadMoreButton.disabled = true;
            currentLoadMoreButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Завантаження...';
        }


        try {
            const recipeRes = await fetch(`${currentApiBaseUrl}/recipes?pageNumber=${currentPage}&pageSize=${recipesPerPage}`);
            if (!recipeRes.ok) {
                throw new Error(`Не вдалося завантажити список рецептів (статус: ${recipeRes.status})`);
            }
            const newRecipes = await recipeRes.json();

            if (clearContainer) {
                if (recipeListContainer) recipeListContainer.innerHTML = '';
                allRecipes = [];
            }

            if (newRecipes && newRecipes.length > 0) {
                allRecipes = allRecipes.concat(newRecipes);
                appendRecipesToDOM(newRecipes, recipeListContainer);
                if (currentLoadMoreButton) currentLoadMoreButton.style.display = 'block';
                if (newRecipes.length < recipesPerPage) {
                    allRecipesLoaded = true;
                    if (currentLoadMoreButton) currentLoadMoreButton.style.display = 'none';
                } else {
                    allRecipesLoaded = false;
                }
            } else {
                allRecipesLoaded = true;
                if (currentLoadMoreButton) currentLoadMoreButton.style.display = 'none';
                if (clearContainer && allRecipes.length === 0) {
                    if (recipeListContainer) recipeListContainer.innerHTML = '<p class="text-muted text-center mt-4 col-12">Рецептів поки що немає.</p>';
                }
            }
        } catch (error) {
            console.error("Помилка завантаження списку рецептів:", error);
            if (clearContainer && recipeListContainer) {
                recipeListContainer.innerHTML = `<p class="text-danger text-center col-12">Не вдалося завантажити рецепти. ${error.message}</p>`;
            }
            if (currentLoadMoreButton) currentLoadMoreButton.style.display = 'block';
            if (allRecipesLoaded && currentLoadMoreButton) currentLoadMoreButton.style.display = 'none';
        } finally {
            isLoadingRecipes = false;
            if (currentLoadMoreButton) {
                currentLoadMoreButton.disabled = false;
                currentLoadMoreButton.innerHTML = '<i class="bi bi-arrow-down-circle-fill me-2"></i> Завантажити ще';
                if (allRecipesLoaded) currentLoadMoreButton.style.display = 'none';
            }
        }
    }

    function appendRecipesToDOM(recipesToAppend, container) {
        if (!container) return;
        recipesToAppend.forEach(r => {
            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6 mb-4';

            let recipeInfoHtml = `<span title="Складність"><i class="bi bi-bar-chart-line"></i> ${r.complexityTag || 'Н/Д'}</span>`;
            recipeInfoHtml += `<span title="Час приготування"><i class="bi bi-clock-history"></i> ${r.preparationTime || 0} хв</span>`;
            recipeInfoHtml += `<span title="Калорії"><i class="bi bi-fire"></i> ${r.calories || 0} ккал/100г</span>`;

            col.innerHTML = `
              <div class="card h-100 recipe-card-custom" onclick="window.location.href='recipe-details.html?id=${r.id}'">
                ${r.imageUrl ? `<img src="${r.imageUrl}" class="card-img-top" alt="${r.title}">` : '<div class="card-img-top-placeholder"></div>'}
                <div class="card-body">
                  <div>
                    <h5 class="card-title">${r.title}</h5>
                    <div class="card-recipe-info">
                        ${recipeInfoHtml}
                    </div>
                    <div class="badges-container">
                      ${r.isVegetarian ? `<span class="badge bg-success-custom me-1"><i class="bi bi-leaf me-1"></i>Вегетаріанське</span>` : ''}
                      ${r.isDrink ? `<span class="badge bg-info-custom">Напій</span>` : ''}
                    </div>
                  </div>
                  <div class="recipe-card-actions">
                    <i class="bi bi-heart action-icon" title="Додати в улюблені"></i>
                  </div>
                </div>
              </div>`;
            container.appendChild(col);
        });
    }

    window.applyFiltersWithPagination = async function ({ apiBaseUrl: currentApiBaseUrl = apiBaseUrl }) {
        const recipeListContainer = document.getElementById('recipe-list');
        if (!recipeListContainer) return;

        currentPage = 1;
        allRecipesLoaded = false;
        recipeListContainer.innerHTML = '<div class="col-12 text-center mt-4"><span class="spinner-border text-primary" role="status"><span class="visually-hidden">Завантаження...</span></span></div>';

        const fEasy = document.getElementById('fEasy')?.checked;
        const fMed = document.getElementById('fMedium')?.checked;
        const fHard = document.getElementById('fHard')?.checked;
        const tMin = parseInt(document.getElementById('fTimeMin')?.value) || 0;
        const tMax = parseInt(document.getElementById('fTimeMax')?.value) || Infinity;
        const cMin = parseInt(document.getElementById('fCountMin')?.value) || 0;
        const cMax = parseInt(document.getElementById('fCountMax')?.value) || Infinity;
        const vegOnly = document.getElementById('fVegetarian')?.checked;
        const drkOnly = document.getElementById('fDrink')?.checked;
        const calMin = parseInt(document.getElementById('fCalMin')?.value) || 0;
        const calMax = parseInt(document.getElementById('fCalMax')?.value) || Infinity;

        const filterCategoriesContainer = document.getElementById('filterCategories');
        let selCats = [];
        if (filterCategoriesContainer) {
            selCats = Array.from(filterCategoriesContainer.querySelectorAll('input:checked'))
                .map(cb => parseInt(cb.value));
        }

        let filterQuery = `pageNumber=${currentPage}&pageSize=${recipesPerPage}`;
        if (fEasy) filterQuery += `&ComplexityTag=Легка`;
        else if (fMed) filterQuery += `&ComplexityTag=Середня`;
        else if (fHard) filterQuery += `&ComplexityTag=Складна`;

        if (tMin > 0) filterQuery += `&MinPreparationTime=${tMin}`;
        if (tMax !== Infinity && tMax > 0 && tMax >= tMin) filterQuery += `&MaxPreparationTime=${tMax}`;
        if (cMin > 0) filterQuery += `&MinIngredientCount=${cMin}`;
        if (cMax !== Infinity && cMax > 0 && cMax >= cMin) filterQuery += `&MaxIngredientCount=${cMax}`;
        if (calMin > 0) filterQuery += `&MinCalories=${calMin}`;
        if (calMax !== Infinity && calMax > 0 && calMax >= calMin) filterQuery += `&MaxCalories=${calMax}`;

        if (vegOnly) filterQuery += `&IsVegetarian=true`;
        if (drkOnly) filterQuery += `&IsDrink=true`;
        selCats.forEach(catId => filterQuery += `&CategoryIds=${catId}`);

        isLoadingRecipes = true;
        if (currentLoadMoreButton) currentLoadMoreButton.style.display = 'none';

        try {
            const recipeRes = await fetch(`${currentApiBaseUrl}/recipes?${filterQuery}`);
            if (!recipeRes.ok) {
                throw new Error(`Не вдалося завантажити відфільтровані рецепти (статус: ${recipeRes.status})`);
            }
            const filteredNewRecipes = await recipeRes.json();

            recipeListContainer.innerHTML = '';
            allRecipes = filteredNewRecipes;

            if (filteredNewRecipes && filteredNewRecipes.length > 0) {
                appendRecipesToDOM(filteredNewRecipes, recipeListContainer);
                if (filteredNewRecipes.length < recipesPerPage) {
                    allRecipesLoaded = true;
                    if (currentLoadMoreButton) currentLoadMoreButton.style.display = 'none';
                } else {
                    if (currentLoadMoreButton) currentLoadMoreButton.style.display = 'block';
                    allRecipesLoaded = false;
                }
            } else {
                recipeListContainer.innerHTML = '<p class="text-muted text-center mt-4 col-12">За цими критеріями нічого не знайдено.</p>';
                allRecipesLoaded = true;
                if (currentLoadMoreButton) currentLoadMoreButton.style.display = 'none';
            }
        } catch (error) {
            console.error("Помилка застосування фільтрів:", error);
            recipeListContainer.innerHTML = `<p class="text-danger text-center col-12">Не вдалося застосувати фільтри. ${error.message}</p>`;
        } finally {
            isLoadingRecipes = false;
        }
    }

    await window.loadAndDisplayRecipes(true, apiBaseUrl);
}