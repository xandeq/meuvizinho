using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations
{
    /// <inheritdoc />
    public partial class MakeConversationListingIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop old unique index that required ListingId to be part of the key
            migrationBuilder.DropIndex(
                name: "IX_Conversations_ListingId_BuyerId_SellerId",
                table: "Conversations");

            // Make ListingId nullable
            migrationBuilder.AlterColumn<int>(
                name: "ListingId",
                table: "Conversations",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            // Filtered unique index for listing-based conversations
            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX [IX_Conversations_Listing]
                ON [Conversations] ([ListingId], [BuyerId], [SellerId])
                WHERE [ListingId] IS NOT NULL;");

            // Filtered unique index for direct conversations (no listing)
            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX [IX_Conversations_Direct]
                ON [Conversations] ([BuyerId], [SellerId])
                WHERE [ListingId] IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS [IX_Conversations_Listing] ON [Conversations];");
            migrationBuilder.Sql("DROP INDEX IF EXISTS [IX_Conversations_Direct] ON [Conversations];");

            migrationBuilder.AlterColumn<int>(
                name: "ListingId",
                table: "Conversations",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldNullable: true,
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ListingId_BuyerId_SellerId",
                table: "Conversations",
                columns: new[] { "ListingId", "BuyerId", "SellerId" },
                unique: true);
        }
    }
}
