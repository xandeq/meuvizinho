using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddListingExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "Listings",
                type: "datetime2",
                nullable: true);

            // Index for the background expiry scan (hourly job)
            migrationBuilder.CreateIndex(
                name: "IX_Listings_ExpiresAt_Status",
                table: "Listings",
                columns: new[] { "ExpiresAt", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Listings_ExpiresAt_Status",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "Listings");
        }
    }
}
