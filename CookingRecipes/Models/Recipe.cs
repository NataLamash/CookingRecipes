using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CookingRecipes.Models;

public partial class Recipe
{
    [Key]
    public int Id { get; set; }

    [StringLength(255)]
    public string Title { get; set; } = null!;

    [StringLength(255)]
    public string? ImageUrl { get; set; }

    public string Instructions { get; set; } = null!;

    public int PreparationTime { get; set; }

    [StringLength(20)]
    public string? ComplexityTag { get; set; }

    public int? IngredientCount { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    public int? Calories { get; set; }

    public bool? IsVegetarian { get; set; }

    public bool? IsDrink { get; set; }

    [InverseProperty("Recipe")]
    public virtual ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();

    [InverseProperty("Recipe")]
    public virtual ICollection<RecipeCategory> RecipeCategories { get; set; } = new List<RecipeCategory>();

    [InverseProperty("Recipe")]
    public virtual ICollection<RecipeIngredient> RecipeIngredients { get; set; } = new List<RecipeIngredient>();
}
