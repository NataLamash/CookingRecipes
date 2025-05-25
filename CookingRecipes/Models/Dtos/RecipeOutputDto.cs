namespace CookingRecipes.Models.Dtos
{
    public class RecipeOutputDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int PreparationTime { get; set; }
        public string? ComplexityTag { get; set; }
        public int? Calories { get; set; }
        public int IngredientCount { get; set; }
        public bool IsVegetarian { get; set; }
        public bool IsDrink { get; set; }
        public string? ImageUrl { get; set; }
        public string Instructions { get; set; } = string.Empty;
        public List<CategoryOutputDto> RecipeCategories { get; set; } = new List<CategoryOutputDto>();
        public List<IngredientInRecipeOutputDto> RecipeIngredients { get; set; } = new List<IngredientInRecipeOutputDto>();
    }
}
