using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations;

public partial class AddGroupPolls : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "GroupPolls",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                GroupId = table.Column<int>(type: "int", nullable: false),
                CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                Question = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                IsClosed = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_GroupPolls", x => x.Id);
                table.ForeignKey("FK_GroupPolls_Groups_GroupId", x => x.GroupId, "Groups", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_GroupPolls_Users_CreatedByUserId", x => x.CreatedByUserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "GroupPollOptions",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                GroupPollId = table.Column<int>(type: "int", nullable: false),
                Text = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                DisplayOrder = table.Column<int>(type: "int", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_GroupPollOptions", x => x.Id);
                table.ForeignKey("FK_GroupPollOptions_GroupPolls_GroupPollId", x => x.GroupPollId, "GroupPolls", "Id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "GroupPollVotes",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                GroupPollId = table.Column<int>(type: "int", nullable: false),
                GroupPollOptionId = table.Column<int>(type: "int", nullable: false),
                UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_GroupPollVotes", x => x.Id);
                table.ForeignKey("FK_GroupPollVotes_GroupPolls_GroupPollId", x => x.GroupPollId, "GroupPolls", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_GroupPollVotes_GroupPollOptions_GroupPollOptionId", x => x.GroupPollOptionId, "GroupPollOptions", "Id", onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_GroupPollVotes_Users_UserId", x => x.UserId, "Users", "Id", onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex("IX_GroupPolls_GroupId_CreatedAt", "GroupPolls", new[] { "GroupId", "CreatedAt" });
        migrationBuilder.CreateIndex("IX_GroupPollOptions_GroupPollId", "GroupPollOptions", "GroupPollId");
        migrationBuilder.CreateIndex("IX_GroupPollVotes_GroupPollId_UserId", "GroupPollVotes", new[] { "GroupPollId", "UserId" }, unique: true);
        migrationBuilder.CreateIndex("IX_GroupPollVotes_GroupPollOptionId", "GroupPollVotes", "GroupPollOptionId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "GroupPollVotes");
        migrationBuilder.DropTable(name: "GroupPollOptions");
        migrationBuilder.DropTable(name: "GroupPolls");
    }
}
