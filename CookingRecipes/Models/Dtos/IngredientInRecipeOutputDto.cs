namespace CookingRecipes.Models.Dtos
{
    public class IngredientInRecipeOutputDto // Або існуючий DTO для інгредієнта в рецепті
    {
        public string? IngredientName { get; set; }
        public int WeightInGrams { get; set; }
    }
}
