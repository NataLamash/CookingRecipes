namespace CookingRecipes.Models.Dtos
{
    public class CategoryOutputDto // Або існуючий DTO для категорії
    {
        public int CategoryId { get; set; }
        public string? CategoryName { get; set; } // Тут CategoryName є nullable string
    }
}
