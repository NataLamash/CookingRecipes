using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CookingRecipes.Models;

public partial class Favorite
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string SessionId { get; set; } = null!;

    public int RecipeId { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? AddedAt { get; set; }

    [ForeignKey("RecipeId")]
    [InverseProperty("Favorites")]
    public virtual Recipe Recipe { get; set; } = null!;
}
