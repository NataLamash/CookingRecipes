using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CookingRecipes.Models;

public partial class RecipeIngredient
{
    [Key]
    public int Id { get; set; }

    public int RecipeId { get; set; }

    public int IngredientId { get; set; }

    [Column(TypeName = "decimal(6, 2)")]
    public decimal? WeightInGrams { get; set; }

    [ForeignKey("IngredientId")]
    [InverseProperty("RecipeIngredients")]
    public virtual Ingredient Ingredient { get; set; } = null!;

    [ForeignKey("RecipeId")]
    [InverseProperty("RecipeIngredients")]
    public virtual Recipe Recipe { get; set; } = null!;
}
