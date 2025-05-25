namespace CookingRecipes.Models.Dtos
{
    public class RecipeIngredientInputDto
    {
        /// <summary>
        /// Ідентифікатор інгредієнту
        /// </summary>
        public int IngredientId { get; set; }

        /// <summary>
        /// Вага інгредієнту в грамах
        /// </summary>
        public decimal WeightInGrams { get; set; }
    }
}