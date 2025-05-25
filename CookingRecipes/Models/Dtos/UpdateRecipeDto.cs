using System.ComponentModel.DataAnnotations;

namespace CookingRecipes.Models.Dtos
{
    public class UpdateRecipeDto : CreateRecipeDto
    {
        [Required]
        public int Id { get; set; }
    }
}