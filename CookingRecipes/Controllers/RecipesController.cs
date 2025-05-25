using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CookingRecipes.Models;
using CookingRecipes.Models.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CookingRecipes.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecipesController : ControllerBase
    {
        private readonly RecipesContext _context;
        private readonly IWebHostEnvironment _env;

        public RecipesController(RecipesContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // GET: api/recipes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Recipe>>> GetRecipes()
        {
            return await _context.Recipes
                .Include(r => r.RecipeIngredients)
                    .ThenInclude(ri => ri.Ingredient)
                .Include(r => r.RecipeCategories)
                    .ThenInclude(rc => rc.Category)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        // GET: api/recipes/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Recipe>> GetRecipe(int id)
        {
            var recipe = await _context.Recipes
                .Include(r => r.RecipeIngredients)
                    .ThenInclude(ri => ri.Ingredient)
                .Include(r => r.RecipeCategories)
                    .ThenInclude(rc => rc.Category)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (recipe == null) return NotFound();
            return recipe;
        }

        // POST: api/recipes
        // multipart/form-data with fields + file
        [HttpPost]
        public async Task<ActionResult<Recipe>> CreateRecipe(
            [FromForm] CreateRecipeDto dto,
            IFormFile? imageFile)
        {
            // 1. Зберігаємо файл
            string? imageUrl = null;
            if (imageFile != null && imageFile.Length > 0)
            {
                var uploads = Path.Combine(_env.WebRootPath, "uploads");
                Directory.CreateDirectory(uploads);
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(imageFile.FileName)}";
                var filePath = Path.Combine(uploads, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await imageFile.CopyToAsync(stream);
                imageUrl = $"/uploads/{fileName}";
            }

            // 2. Створюємо рецепт
            var recipe = new Recipe
            {
                Title = dto.Title.Trim(),
                ImageUrl = imageUrl,
                Instructions = dto.Instructions.Trim(),
                PreparationTime = dto.PreparationTime,
                CreatedAt = DateTime.Now,
                IsVegetarian = dto.IsVegetarian,
                IsDrink = dto.IsDrink,
                ComplexityTag = dto.PreparationTime <= 20
                    ? "Легка"
                    : dto.PreparationTime <= 40
                        ? "Середня"
                        : "Складна"
            };

            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync(); // отримуємо recipe.Id

            // 3. Прив’язуємо категорії
            foreach (var catId in dto.CategoryIds.Distinct())
            {
                _context.RecipeCategories.Add(new RecipeCategory
                {
                    RecipeId = recipe.Id,
                    CategoryId = catId
                });
            }

            // 4. Додаємо інгредієнти та рахуємо калорії/вагу
            decimal totalWeight = 0m, totalCals = 0m;
            foreach (var inp in dto.Ingredients)
            {
                var ingr = await _context.Ingredients.FindAsync(inp.IngredientId);
                if (ingr == null)
                    return BadRequest($"Інгредієнт з Id={inp.IngredientId} не знайдено.");

                _context.RecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId = recipe.Id,
                    IngredientId = ingr.Id,
                    WeightInGrams = inp.WeightInGrams
                });

                totalWeight += inp.WeightInGrams;
                totalCals += (ingr.CaloriesPer100g.GetValueOrDefault() / 100m)
                                * inp.WeightInGrams;
            }

            recipe.IngredientCount = dto.Ingredients.Count;
            recipe.Calories = totalWeight > 0
                ? (int)Math.Round(totalCals / totalWeight * 100m)
                : 0;

            _context.Entry(recipe).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRecipe),
                new { id = recipe.Id }, recipe);
        }

        // PUT: api/recipes/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRecipe(
            int id,
            [FromForm] UpdateRecipeDto dto,
            IFormFile? imageFile)
        {
            if (id != dto.Id) return BadRequest("ID не співпадає.");

            var recipe = await _context.Recipes
                .Include(r => r.RecipeCategories)
                .Include(r => r.RecipeIngredients)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (recipe == null) return NotFound();

            // 1. Оновлюємо файл, якщо є
            if (imageFile != null && imageFile.Length > 0)
            {
                var uploads = Path.Combine(_env.WebRootPath, "uploads");
                Directory.CreateDirectory(uploads);
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(imageFile.FileName)}";
                var filePath = Path.Combine(uploads, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await imageFile.CopyToAsync(stream);
                recipe.ImageUrl = $"/uploads/{fileName}";
            }

            // 2. Оновлюємо прості поля
            recipe.Title = dto.Title.Trim();
            recipe.Instructions = dto.Instructions.Trim();
            recipe.PreparationTime = dto.PreparationTime;
            recipe.IsVegetarian = dto.IsVegetarian;
            recipe.IsDrink = dto.IsDrink;
            recipe.ComplexityTag = dto.PreparationTime <= 20
                ? "Легка"
                : dto.PreparationTime <= 40
                    ? "Середня"
                    : "Складна";

            // 3. Оновлюємо категорії
            _context.RecipeCategories.RemoveRange(recipe.RecipeCategories);
            foreach (var catId in dto.CategoryIds.Distinct())
            {
                _context.RecipeCategories.Add(new RecipeCategory
                {
                    RecipeId = recipe.Id,
                    CategoryId = catId
                });
            }

            // 4. Оновлюємо інгредієнти
            _context.RecipeIngredients.RemoveRange(recipe.RecipeIngredients);
            decimal totalWeight = 0m, totalCals = 0m;
            foreach (var inp in dto.Ingredients)
            {
                var ingr = await _context.Ingredients.FindAsync(inp.IngredientId);
                if (ingr == null)
                    return BadRequest($"Інгредієнт з Id={inp.IngredientId} не знайдено.");

                _context.RecipeIngredients.Add(new RecipeIngredient
                {
                    RecipeId = recipe.Id,
                    IngredientId = ingr.Id,
                    WeightInGrams = inp.WeightInGrams
                });

                totalWeight += inp.WeightInGrams;
                totalCals += (ingr.CaloriesPer100g.GetValueOrDefault() / 100m)
                                * inp.WeightInGrams;
            }

            recipe.IngredientCount = dto.Ingredients.Count;
            recipe.Calories = totalWeight > 0
                ? (int)Math.Round(totalCals / totalWeight * 100m)
                : 0;

            // 5. Зберігаємо зміни
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Recipes.AnyAsync(r => r.Id == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        // DELETE: api/recipes/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRecipe(int id)
        {
            var recipe = await _context.Recipes.FindAsync(id);
            if (recipe == null) return NotFound();

            // Видаляємо зв’язки
            _context.RecipeCategories.RemoveRange(
                _context.RecipeCategories.Where(rc => rc.RecipeId == id));
            _context.RecipeIngredients.RemoveRange(
                _context.RecipeIngredients.Where(ri => ri.RecipeId == id));

            _context.Recipes.Remove(recipe);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
