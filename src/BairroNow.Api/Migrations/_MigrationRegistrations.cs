// Provides [Migration] attributes for migrations that were written without Designer.cs files.
// EF Core requires [Migration("timestamp_name")] to discover migration classes.
// Without it, the migration exists in the assembly but is never applied.
using BairroNow.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BairroNow.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260516000001_AddExpoPushToken")]
    partial class AddExpoPushToken { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260517000001_AddIsBusinessAccount")]
    partial class AddIsBusinessAccount { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260518000001_AddBusinessProfileFields")]
    partial class AddBusinessProfileFields { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260518000002_AddBusinessRatings")]
    partial class AddBusinessRatings { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260518000003_AddBusinessPhotosAndIsBanned")]
    partial class AddBusinessPhotosAndIsBanned { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260518000004_AddProfileViews")]
    partial class AddProfileViews { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260518000005_MakeConversationListingIdNullable")]
    partial class MakeConversationListingIdNullable { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260518000006_AddListingExpiry")]
    partial class AddListingExpiry { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260518000007_FixListingExpiryIndexOrder")]
    partial class FixListingExpiryIndexOrder { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260520000001_AddListingRowVersion")]
    partial class AddListingRowVersion { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260520000002_AddGroupPolls")]
    partial class AddGroupPolls { }

    [DbContext(typeof(AppDbContext))]
    [Migration("20260523000001_AddNotificationGroupId")]
    partial class AddNotificationGroupId { }

}
