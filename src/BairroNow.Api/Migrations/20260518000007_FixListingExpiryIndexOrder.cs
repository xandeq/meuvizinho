using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixListingExpiryIndexOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Previous migration created (ExpiresAt, Status) which is not sargable for
            // WHERE Status = 'Active' AND ExpiresAt < @now — leading column must be Status.
            migrationBuilder.DropIndex(
                name: "IX_Listings_ExpiresAt_Status",
                table: "Listings");

            migrationBuilder.CreateIndex(
                name: "IX_Listings_Status_ExpiresAt",
                table: "Listings",
                columns: new[] { "Status", "ExpiresAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Listings_Status_ExpiresAt",
                table: "Listings");

            migrationBuilder.CreateIndex(
                name: "IX_Listings_ExpiresAt_Status",
                table: "Listings",
                columns: new[] { "ExpiresAt", "Status" });
        }
    }
}
