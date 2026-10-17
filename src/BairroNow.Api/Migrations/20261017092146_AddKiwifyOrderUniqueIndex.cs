using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddKiwifyOrderUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Roda no start da API (Database.Migrate): se já houvesse eventos repetidos, criar o índice
            // único falharia e derrubaria a API. Repetições viram "KiwifyOrderDup" (histórico preservado).
            migrationBuilder.Sql(@"
                WITH d AS (
                    SELECT Id, ROW_NUMBER() OVER (PARTITION BY EntityId ORDER BY Id) AS rn
                    FROM AuditLogs WHERE EntityType = N'KiwifyOrder')
                UPDATE a SET EntityType = N'KiwifyOrderDup'
                FROM AuditLogs a JOIN d ON d.Id = a.Id WHERE d.rn > 1;");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_KiwifyOrder_Unique",
                table: "AuditLogs",
                columns: new[] { "EntityType", "EntityId" },
                unique: true,
                filter: "[EntityType] = N'KiwifyOrder'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_KiwifyOrder_Unique",
                table: "AuditLogs");
        }
    }
}
