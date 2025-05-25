using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CookingRecipes.Models;
using CookingRecipes.Models.Dtos;

namespace CookingRecipes.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IngredientsController : ControllerBase
    {
        private readonly RecipesContext _context;

        public IngredientsController(RecipesContext context)
        {
            _context = context;
        }

        // GET: api/ingredients
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Ingredient>>> GetIngredients()
        {
            return await _context.Ingredients
                                 .OrderBy(i => i.Name)
                                 .ToListAsync();
        }

        // GET: api/ingredients/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Ingredient>> GetIngredient(int id)
        {
            var ingredient = await _context.Ingredients.FindAsync(id);
            if (ingredient == null) return NotFound();
            return ingredient;
        }

        // POST: api/ingredients
        [HttpPost]
        public async Task<ActionResult<IEnumerable<Ingredient>>> CreateIngredients([FromBody] CreateIngredientsDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Names))
                return BadRequest("Потрібно хоча б одне значення.");

            // 1) Розбиваємо рядок на частини за комами
            var entries = dto.Names
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(x => x.Trim())
                .Where(x => x.Contains('-'))
                .Select(x => {
                    var parts = x.Split('-', 2);
                    return new
                    {
                        Name = parts[0].Trim(),
                        Calories = int.TryParse(parts[1].Trim(), out var c) ? c : 0
                    };
                })
                .Where(x => x.Name.Length > 0 && x.Calories > 0)
                .GroupBy(x => x.Name, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .ToList();

            if (!entries.Any())
                return BadRequest("Немає валідних пар “назва – калорії”.");

            // 2) Знайти існуючі імена
            var existingNames = await _context.Ingredients
                .Where(i => entries.Select(e => e.Name).Contains(i.Name))
                .Select(i => i.Name)
                .ToListAsync();

            // 3) Додати нові
            foreach (var e in entries.Where(e => !existingNames.Contains(e.Name, StringComparer.OrdinalIgnoreCase)))
            {
                _context.Ingredients.Add(new Ingredient
                {
                    Name = e.Name,
                    CaloriesPer100g = e.Calories
                });
            }
            await _context.SaveChangesAsync();

            // 4) Повернути всі запитані елементи з БД
            var result = await _context.Ingredients
                .Where(i => entries.Select(e => e.Name).Contains(i.Name))
                .OrderBy(i => i.Name)
                .ToListAsync();

            return Ok(result);
        }

        // PUT: api/ingredients/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateIngredient(int id, [FromBody] Ingredient ingredient)
        {
            if (id != ingredient.Id)
                return BadRequest("ID mismatch.");

            _context.Entry(ingredient).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await _context.Ingredients.AnyAsync(i => i.Id == id))
                    return NotFound();
                throw;
            }

            return NoContent();
        }

        // DELETE: api/ingredients/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIngredient(int id)
        {
            var ingredient = await _context.Ingredients.FindAsync(id);
            if (ingredient == null) return NotFound();

            _context.Ingredients.Remove(ingredient);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
