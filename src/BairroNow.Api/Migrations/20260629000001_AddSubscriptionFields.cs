using BairroNow.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations;

// Wave — Trial/Subscription system.
// NOTA: migration escrita à mão — dotnet-ef design-time bloqueado pela política
// Windows App Control nesta máquina (Smart App Control, 0x800711C7).
// Em CI/Linux o EF geraria idêntico.
[DbContext(typeof(AppDbContext))]
[Migration("20260629000001_AddSubscriptionFields")]
public partial class AddSubscriptionFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Plan",
            table: "Users",
            type: "nvarchar(50)",
            maxLength: 50,
            nullable: false,
            defaultValue: "free");

        migrationBuilder.AddColumn<DateTime>(
            name: "PlanExpiresAt",
            table: "Users",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "TrialUsedAt",
            table: "Users",
            type: "datetime2",
            nullable: true);

        // Index for the TrialExpiryService hourly scan
        migrationBuilder.CreateIndex(
            name: "IX_Users_Plan_PlanExpiresAt",
            table: "Users",
            columns: new[] { "Plan", "PlanExpiresAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Users_Plan_PlanExpiresAt",
            table: "Users");

        migrationBuilder.DropColumn(name: "Plan", table: "Users");
        migrationBuilder.DropColumn(name: "PlanExpiresAt", table: "Users");
        migrationBuilder.DropColumn(name: "TrialUsedAt", table: "Users");
    }
}
