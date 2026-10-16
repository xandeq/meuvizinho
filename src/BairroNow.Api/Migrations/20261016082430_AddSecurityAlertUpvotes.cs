using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityAlertUpvotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SecurityAlertUpvotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SecurityAlertId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityAlertUpvotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SecurityAlertUpvotes_SecurityAlerts_SecurityAlertId",
                        column: x => x.SecurityAlertId,
                        principalTable: "SecurityAlerts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityAlertUpvotes_SecurityAlertId_UserId",
                table: "SecurityAlertUpvotes",
                columns: new[] { "SecurityAlertId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SecurityAlertUpvotes");
        }
    }
}
