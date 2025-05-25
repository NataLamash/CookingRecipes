using System.ComponentModel.DataAnnotations;

namespace CookingRecipes.Models.Dtos
{
    public class UpdateRecipeDto
    {
        [Required]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string Title { get; set; } = null!;

        [Required]
        public string Instructions { get; set; } = null!;

        [Required]
        [Range(0, int.MaxValue)]
        public int PreparationTime { get; set; }

        public bool IsVegetarian { get; set; }
        public bool IsDrink { get; set; }

        public List<int> CategoryIds { get; set; } = new List<int>();
        public List<RecipeIngredientInputDto> Ingredients { get; set; } = new List<RecipeIngredientInputDto>();

        public IFormFile? ImageFile { get; set; } // Додана властивість
    }
}