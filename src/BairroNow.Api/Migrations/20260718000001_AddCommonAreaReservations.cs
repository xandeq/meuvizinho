using System;
using BairroNow.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations;

// Wave S — Reserva de áreas comuns de condomínio (moradores + áreas + reservas).
// NOTA: migration escrita à mão. O dotnet-ef design-time é bloqueado nesta máquina
// pela política Windows Application Control (Smart App Control, 0x800711C7) ao
// carregar o assembly recém-compilado. Em CI/Linux o EF gera idêntico. As operações
// abaixo refletem exatamente a config em AppDbContext.OnModelCreating (Wave S).
[DbContext(typeof(AppDbContext))]
[Migration("20260718000001_AddCommonAreaReservations")]
public partial class AddCommonAreaReservations : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CondominiumResidents",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                CondominiumId = table.Column<int>(type: "int", nullable: false),
                UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Unit = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                ReviewNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CondominiumResidents", x => x.Id);
                table.ForeignKey("FK_CondominiumResidents_Condominiums_CondominiumId", x => x.CondominiumId, "Condominiums", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_CondominiumResidents_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "CommonAreas",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                CondominiumId = table.Column<int>(type: "int", nullable: false),
                Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                Rules = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                Capacity = table.Column<int>(type: "int", nullable: true),
                CoverImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                RequiresApproval = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                OpenTime = table.Column<TimeOnly>(type: "time", nullable: true),
                CloseTime = table.Column<TimeOnly>(type: "time", nullable: true),
                MinAdvanceHours = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                MaxAdvanceDays = table.Column<int>(type: "int", nullable: false, defaultValue: 90),
                MaxDurationMinutes = table.Column<int>(type: "int", nullable: true),
                IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CommonAreas", x => x.Id);
                table.ForeignKey("FK_CommonAreas_Condominiums_CondominiumId", x => x.CondominiumId, "Condominiums", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "AreaReservations",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                CommonAreaId = table.Column<int>(type: "int", nullable: false),
                CondominiumId = table.Column<int>(type: "int", nullable: false),
                UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Title = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                GuestsCount = table.Column<int>(type: "int", nullable: true),
                StartUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                EndUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                ReviewNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AreaReservations", x => x.Id);
                table.ForeignKey("FK_AreaReservations_CommonAreas_CommonAreaId", x => x.CommonAreaId, "CommonAreas", "Id", onDelete: ReferentialAction.Cascade);
                // NoAction: CommonAreas já cascateia de Condominiums — evita múltiplos caminhos de cascade.
                table.ForeignKey("FK_AreaReservations_Condominiums_CondominiumId", x => x.CondominiumId, "Condominiums", "Id");
                table.ForeignKey("FK_AreaReservations_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex("IX_CondominiumResidents_CondominiumId_Status", "CondominiumResidents", new[] { "CondominiumId", "Status" });
        migrationBuilder.CreateIndex("IX_CondominiumResidents_UserId", "CondominiumResidents", "UserId");
        migrationBuilder.CreateIndex("IX_CommonAreas_CondominiumId_IsActive", "CommonAreas", new[] { "CondominiumId", "IsActive" });
        migrationBuilder.CreateIndex("IX_AreaReservations_CommonAreaId_StartUtc_EndUtc", "AreaReservations", new[] { "CommonAreaId", "StartUtc", "EndUtc" });
        migrationBuilder.CreateIndex("IX_AreaReservations_CondominiumId_Status", "AreaReservations", new[] { "CondominiumId", "Status" });
        migrationBuilder.CreateIndex("IX_AreaReservations_UserId_StartUtc", "AreaReservations", new[] { "UserId", "StartUtc" });

        // Índices únicos de integridade (backstop contra duplicidade sob concorrência).
        migrationBuilder.CreateIndex("IX_CondominiumResidents_CondominiumId_UserId", "CondominiumResidents", new[] { "CondominiumId", "UserId" }, unique: true, filter: "[Status] IN ('Pending','Approved')");
        migrationBuilder.CreateIndex("IX_CommonAreas_CondominiumId_Name", "CommonAreas", new[] { "CondominiumId", "Name" }, unique: true, filter: "[DeletedAt] IS NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "AreaReservations");
        migrationBuilder.DropTable(name: "CommonAreas");
        migrationBuilder.DropTable(name: "CondominiumResidents");
    }
}
