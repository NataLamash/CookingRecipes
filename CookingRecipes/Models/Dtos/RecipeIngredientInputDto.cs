using System.ComponentModel.DataAnnotations;

namespace CookingRecipes.Models.Dtos
{
    public class RecipeIngredientInputDto
    {
        [Required]
        public int IngredientId { get; set; }

        [Required]
        [Range(0.01, (double)decimal.MaxValue)] // Вага має бути позитивною
        public decimal WeightInGrams { get; set; } // Тип decimal для ваги
    }
}