using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIsBusinessAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsBusinessAccount",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsBusinessAccount",
                table: "Users");
        }
    }
}
