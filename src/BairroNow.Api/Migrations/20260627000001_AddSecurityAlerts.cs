using System;
using BairroNow.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations;

// Wave Q — Alertas de segurança geolocalizados.
// NOTA: migration escrita à mão — dotnet-ef design-time bloqueado pela política
// Windows App Control nesta máquina (Smart App Control, 0x800711C7).
// Em CI/Linux o EF geraria idêntico. Reflete exatamente AppDbContext.OnModelCreating (Wave Q).
[DbContext(typeof(AppDbContext))]
[Migration("20260627000001_AddSecurityAlerts")]
public partial class AddSecurityAlerts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "SecurityAlerts",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                BairroId = table.Column<int>(type: "int", nullable: false),
                Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                Latitude = table.Column<double>(type: "float", nullable: true),
                Longitude = table.Column<double>(type: "float", nullable: true),
                LocationDescription = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                ResolutionNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                UpvoteCount = table.Column<int>(type: "int", nullable: false),
                ReportedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                ResolvedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SecurityAlerts", x => x.Id);
                table.ForeignKey(
                    name: "FK_SecurityAlerts_Bairros_BairroId",
                    column: x => x.BairroId,
                    principalTable: "Bairros",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_SecurityAlerts_Users_ReportedByUserId",
                    column: x => x.ReportedByUserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
            name: "IX_SecurityAlerts_BairroId_CreatedAt",
            table: "SecurityAlerts",
            columns: new[] { "BairroId", "CreatedAt" });

        migrationBuilder.CreateIndex(
            name: "IX_SecurityAlerts_BairroId_Status",
            table: "SecurityAlerts",
            columns: new[] { "BairroId", "Status" });

        migrationBuilder.CreateIndex(
            name: "IX_SecurityAlerts_ReportedByUserId",
            table: "SecurityAlerts",
            column: "ReportedByUserId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SecurityAlerts");
    }
}
