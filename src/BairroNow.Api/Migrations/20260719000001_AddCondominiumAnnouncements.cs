using System;
using BairroNow.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations;

// Wave T — Comunicados oficiais do síndico (mural do condomínio).
// NOTA: migration escrita à mão. O dotnet-ef design-time é bloqueado nesta máquina
// pela política Windows Application Control (Smart App Control, 0x800711C7) ao
// carregar o assembly recém-compilado. Em CI/Linux o EF gera idêntico. As operações
// abaixo refletem exatamente a config em AppDbContext.OnModelCreating (Wave T).
[DbContext(typeof(AppDbContext))]
[Migration("20260719000001_AddCondominiumAnnouncements")]
public partial class AddCondominiumAnnouncements : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CondominiumAnnouncements",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                CondominiumId = table.Column<int>(type: "int", nullable: false),
                Title = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                Body = table.Column<string>(type: "nvarchar(max)", nullable: false),
                AuthorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                IsImportant = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                IsPinned = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CondominiumAnnouncements", x => x.Id);
                table.ForeignKey("FK_CondominiumAnnouncements_Condominiums_CondominiumId", x => x.CondominiumId, "Condominiums", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_CondominiumAnnouncements_Users_AuthorUserId", x => x.AuthorUserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
            });

        // Índice da listagem: fixados primeiro (IsPinned desc), depois recentes
        // (PublishedAt desc), só ativos ([DeletedAt] IS NULL).
        migrationBuilder.CreateIndex(
            name: "IX_CondominiumAnnouncements_CondominiumId_IsPinned_PublishedAt",
            table: "CondominiumAnnouncements",
            columns: new[] { "CondominiumId", "IsPinned", "PublishedAt" },
            filter: "[DeletedAt] IS NULL",
            descending: new[] { false, true, true });

        migrationBuilder.CreateIndex(
            name: "IX_CondominiumAnnouncements_CondominiumId_PublishedAt",
            table: "CondominiumAnnouncements",
            columns: new[] { "CondominiumId", "PublishedAt" });

        migrationBuilder.CreateIndex(
            name: "IX_CondominiumAnnouncements_AuthorUserId",
            table: "CondominiumAnnouncements",
            column: "AuthorUserId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "CondominiumAnnouncements");
    }
}
