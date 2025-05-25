using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CookingRecipes.Models;
using CookingRecipes.Models.Dtos;

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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RecipeOutputDto>>> GetRecipes(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 6,
            [FromQuery] string? complexityTag = null,
            [FromQuery] bool? isVegetarian = null,
            [FromQuery] bool? isDrink = null,
            [FromQuery] int? minPreparationTime = null,
            [FromQuery] int? maxPreparationTime = null,
            [FromQuery] List<int>? categoryIds = null)
        {
            Console.WriteLine($"DEBUG: GetRecipes (Paged & Filtered) called! Page: {pageNumber}, Size: {pageSize}");
            try
            {
                if (pageNumber < 1) pageNumber = 1;
                if (pageSize < 1) pageSize = 3;
                if (pageSize > 50) pageSize = 50;

                var query = _context.Recipes.AsQueryable();

                if (!string.IsNullOrEmpty(complexityTag))
                {
                    query = query.Where(r => r.ComplexityTag == complexityTag);
                }
                if (isVegetarian.HasValue)
                {
                    query = query.Where(r => r.IsVegetarian == isVegetarian.Value);
                }
                if (isDrink.HasValue)
                {
                    query = query.Where(r => r.IsDrink == isDrink.Value);
                }
                if (minPreparationTime.HasValue)
                {
                    query = query.Where(r => r.PreparationTime >= minPreparationTime.Value);
                }
                if (maxPreparationTime.HasValue)
                {
                    query = query.Where(r => r.PreparationTime <= maxPreparationTime.Value);
                }
                if (categoryIds != null && categoryIds.Any())
                {
                    query = query.Where(r => r.RecipeCategories.Any(rc => categoryIds.Contains(rc.CategoryId)));
                }

                var recipes = await query
                    .OrderByDescending(r => r.Id)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(r => new RecipeOutputDto
                    {
                        Id = r.Id,
                        Title = r.Title,
                        PreparationTime = r.PreparationTime,
                        ComplexityTag = r.ComplexityTag,
                        Calories = r.Calories,
                        IngredientCount = r.IngredientCount ?? 0, // Обробка nullable IngredientCount
                        IsVegetarian = r.IsVegetarian ?? false,
                        IsDrink = r.IsDrink ?? false,
                        ImageUrl = r.ImageUrl,
                        Instructions = r.Instructions, // Додано Instructions
                        RecipeCategories = r.RecipeCategories.Select(rc => new CategoryOutputDto
                        {
                            CategoryId = rc.Category.Id,
                            CategoryName = rc.Category.Name
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(recipes);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetRecipes (Paged & Filtered): {ex.ToString()}");
                return StatusCode(500, $"Внутрішня помилка сервера: {ex.Message}");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<RecipeOutputDto>> GetRecipe(int id)
        {
            Console.WriteLine($"DEBUG: GetRecipe by ID called with ID: {id}");
            try
            {
                var recipeEntity = await _context.Recipes
                    .Include(r => r.RecipeCategories)
                        .ThenInclude(rc => rc.Category)
                    .Include(r => r.RecipeIngredients)
                        .ThenInclude(ri => ri.Ingredient)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (recipeEntity == null)
                {
                    Console.WriteLine($"DEBUG: Recipe with ID: {id} not found.");
                    return NotFound();
                }

                var recipeDto = new RecipeOutputDto
                {
                    Id = recipeEntity.Id,
                    Title = recipeEntity.Title,
                    PreparationTime = recipeEntity.PreparationTime,
                    ComplexityTag = recipeEntity.ComplexityTag,
                    Calories = recipeEntity.Calories,
                    IngredientCount = recipeEntity.IngredientCount ?? 0, // Обробка nullable
                    IsVegetarian = recipeEntity.IsVegetarian ?? false,
                    IsDrink = recipeEntity.IsDrink ?? false,
                    ImageUrl = recipeEntity.ImageUrl,
                    Instructions = recipeEntity.Instructions,
                    RecipeCategories = recipeEntity.RecipeCategories.Select(rc => new CategoryOutputDto
                    {
                        CategoryId = rc.Category.Id,
                        CategoryName = rc.Category.Name
                    }).ToList(),
                    RecipeIngredients = recipeEntity.RecipeIngredients.Select(ri => new IngredientInRecipeOutputDto
                    {
                        IngredientName = ri.Ingredient.Name,
                        WeightInGrams = (int)(ri.WeightInGrams ?? 0m) // Обробка nullable decimal
                    }).ToList()
                };
                return Ok(recipeDto);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetRecipe by ID: {ex.ToString()}");
                return StatusCode(500, $"Внутрішня помилка сервера: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<RecipeOutputDto>> CreateRecipe([FromForm] CreateRecipeDto dto)
        {
            string? imageUrl = null;
            if (dto.ImageFile != null && dto.ImageFile.Length > 0)
            {
                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(dto.ImageFile.FileName)}"; // Безпечніше ім'я файлу
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.ImageFile.CopyToAsync(stream);
                }
                imageUrl = $"/uploads/{uniqueFileName}";
            }

            var recipe = new Recipe
            {
                Title = dto.Title.Trim(),
                ImageUrl = imageUrl,
                Instructions = dto.Instructions.Trim(),
                PreparationTime = dto.PreparationTime,
                CreatedAt = DateTime.UtcNow,
                IsVegetarian = dto.IsVegetarian,
                IsDrink = dto.IsDrink,
                ComplexityTag = dto.PreparationTime <= 20 ? "Легка" : (dto.PreparationTime <= 40 ? "Середня" : "Складна")
            };

            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync();

            if (dto.CategoryIds != null)
            {
                foreach (var catId in dto.CategoryIds.Distinct())
                {
                    if (await _context.Categories.AnyAsync(c => c.Id == catId))
                    {
                        _context.RecipeCategories.Add(new RecipeCategory { RecipeId = recipe.Id, CategoryId = catId });
                    }
                }
            }

            decimal totalWeight = 0m;
            decimal totalCaloriesSum = 0m;
            if (dto.Ingredients != null)
            {
                foreach (var inp in dto.Ingredients)
                {
                    var ingredientEntity = await _context.Ingredients.FindAsync(inp.IngredientId);
                    if (ingredientEntity == null) return BadRequest($"Інгредієнт з Id={inp.IngredientId} не знайдено.");

                    _context.RecipeIngredients.Add(new RecipeIngredient
                    {
                        RecipeId = recipe.Id,
                        IngredientId = ingredientEntity.Id,
                        WeightInGrams = inp.WeightInGrams
                    });

                    totalWeight += inp.WeightInGrams;
                    totalCaloriesSum += (ingredientEntity.CaloriesPer100g.GetValueOrDefault(0) / 100m) * inp.WeightInGrams;
                }
            }

            recipe.IngredientCount = dto.Ingredients?.Count ?? 0;
            recipe.Calories = totalWeight > 0 ? (int)Math.Round(totalCaloriesSum / totalWeight * 100m) : (int?)null;

            _context.Entry(recipe).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            var createdRecipeDto = await _context.Recipes
                .Where(r => r.Id == recipe.Id)
                .Select(r => new RecipeOutputDto
                {
                    Id = r.Id,
                    Title = r.Title,
                    PreparationTime = r.PreparationTime,
                    ComplexityTag = r.ComplexityTag,
                    Calories = r.Calories,
                    IngredientCount = r.IngredientCount ?? 0,
                    IsVegetarian = r.IsVegetarian ?? false,
                    IsDrink = r.IsDrink ?? false,
                    ImageUrl = r.ImageUrl,
                    Instructions = r.Instructions,
                    RecipeCategories = r.RecipeCategories.Select(rc => new CategoryOutputDto { CategoryId = rc.Category.Id, CategoryName = rc.Category.Name }).ToList(),
                    RecipeIngredients = r.RecipeIngredients.Select(ri => new IngredientInRecipeOutputDto { IngredientName = ri.Ingredient.Name, WeightInGrams = (int)(ri.WeightInGrams ?? 0m) }).ToList()
                })
                .FirstOrDefaultAsync();

            if (createdRecipeDto == null) return Problem("Не вдалося отримати DTO для створеного рецепту.");

            return CreatedAtAction(nameof(GetRecipe), new { id = recipe.Id }, createdRecipeDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRecipe(int id, [FromForm] UpdateRecipeDto dto)
        {
            if (id != dto.Id) return BadRequest("ID не співпадає.");

            var recipe = await _context.Recipes
                .Include(r => r.RecipeCategories)
                .Include(r => r.RecipeIngredients)
                    .ThenInclude(ri => ri.Ingredient)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (recipe == null) return NotFound($"Рецепт з ID {id} не знайдено.");

            if (dto.ImageFile != null && dto.ImageFile.Length > 0)
            {
                // Можна додати логіку видалення старого файлу recipe.ImageUrl, якщо він існує
                var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);
                var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(dto.ImageFile.FileName)}";
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.ImageFile.CopyToAsync(stream);
                }
                recipe.ImageUrl = $"/uploads/{uniqueFileName}";
            }

            recipe.Title = dto.Title.Trim();
            recipe.Instructions = dto.Instructions.Trim();
            recipe.PreparationTime = dto.PreparationTime;
            recipe.IsVegetarian = dto.IsVegetarian;
            recipe.IsDrink = dto.IsDrink;
            recipe.ComplexityTag = dto.PreparationTime <= 20 ? "Легка" : (dto.PreparationTime <= 40 ? "Середня" : "Складна");

            _context.RecipeCategories.RemoveRange(recipe.RecipeCategories);
            recipe.RecipeCategories.Clear(); // Очищаємо колекцію для EF Core
            if (dto.CategoryIds != null)
            {
                foreach (var catId in dto.CategoryIds.Distinct())
                {
                    if (await _context.Categories.AnyAsync(c => c.Id == catId))
                    {
                        recipe.RecipeCategories.Add(new RecipeCategory { CategoryId = catId });
                    }
                }
            }

            _context.RecipeIngredients.RemoveRange(recipe.RecipeIngredients);
            recipe.RecipeIngredients.Clear();

            decimal totalWeight = 0m;
            decimal totalCaloriesSum = 0m;
            if (dto.Ingredients != null)
            {
                foreach (var inp in dto.Ingredients)
                {
                    var ingredientEntity = await _context.Ingredients.FindAsync(inp.IngredientId);
                    if (ingredientEntity == null) return BadRequest($"Інгредієнт з Id={inp.IngredientId} не знайдено.");

                    recipe.RecipeIngredients.Add(new RecipeIngredient
                    {
                        IngredientId = ingredientEntity.Id,
                        WeightInGrams = inp.WeightInGrams
                    });

                    totalWeight += inp.WeightInGrams;
                    totalCaloriesSum += (ingredientEntity.CaloriesPer100g.GetValueOrDefault(0) / 100m) * inp.WeightInGrams;
                }
            }

            recipe.IngredientCount = dto.Ingredients?.Count ?? 0;
            recipe.Calories = totalWeight > 0 ? (int)Math.Round(totalCaloriesSum / totalWeight * 100m) : (int?)null;

            _context.Entry(recipe).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Recipes.AnyAsync(r => r.Id == id)) return NotFound();
                else throw;
            }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRecipe(int id)
        {
            var recipe = await _context.Recipes.FindAsync(id);
            if (recipe == null) return NotFound();

            var recipeCategoriesToRemove = await _context.RecipeCategories.Where(rc => rc.RecipeId == id).ToListAsync();
            _context.RecipeCategories.RemoveRange(recipeCategoriesToRemove);

            var recipeIngredientsToRemove = await _context.RecipeIngredients.Where(ri => ri.RecipeId == id).ToListAsync();
            _context.RecipeIngredients.RemoveRange(recipeIngredientsToRemove);

            _context.Recipes.Remove(recipe);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}