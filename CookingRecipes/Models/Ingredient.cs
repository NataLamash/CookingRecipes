using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CookingRecipes.Models;

[Index("Name", Name = "UQ__Ingredie__737584F63FBC716E", IsUnique = true)]
public partial class Ingredient
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string Name { get; set; } = null!;

    public int? CaloriesPer100g { get; set; }

    [InverseProperty("Ingredient")]
    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
}
