namespace CookingRecipes.Models.Dtos
{
    public class CreateIngredientsDto
    {
        /// <summary>
        /// Користувацький ввід у форматі:
        /// "яйця - 155, куряче філе - 300, ананас - 400"
        /// calorie – ккал на 100 г
        /// </summary>
        public string Names { get; set; } = string.Empty;
    }
}