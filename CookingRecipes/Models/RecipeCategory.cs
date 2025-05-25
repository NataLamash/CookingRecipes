using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CookingRecipes.Models;

public partial class RecipeCategory
{
    [Key]
    public int Id { get; set; }

    public int RecipeId { get; set; }

    public int CategoryId { get; set; }

    [ForeignKey("CategoryId")]
    [InverseProperty("RecipeCategories")]
    public virtual Category Category { get; set; } = null!;

    [ForeignKey("RecipeId")]
    [InverseProperty("RecipeCategories")]
    public virtual Recipe Recipe { get; set; } = null!;
}
