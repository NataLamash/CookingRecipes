using System.ComponentModel.DataAnnotations;

namespace CookingRecipes.Models.Dtos
{
    public class CreateRecipeDto
    {
        [Required, StringLength(255)]
        public string Title { get; set; } = null!;

        [StringLength(255)]
        public string? ImageUrl { get; set; }

        [Required]
        public string Instructions { get; set; } = null!;

        [Range(0, 1000)]
        public int PreparationTime { get; set; }

        public bool? IsVegetarian { get; set; }
        public bool? IsDrink { get; set; }

        /// <summary>
        /// Список інгредієнтів із вагою
        /// </summary>
        [Required]
        public List<RecipeIngredientInputDto> Ingredients { get; set; } = new();

        public List<int> CategoryIds { get; set; } = new();
    }
}