// Wave P + master merged 2026-06-29
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Bairro> Bairros => Set<Bairro>();
    public DbSet<Verification> Verifications => Set<Verification>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostImage> PostImages => Set<PostImage>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<PostLike> PostLikes => Set<PostLike>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<Notification> Notifications => Set<Notification>();

    // Phase 4 (04-01) Marketplace + Chat
    public DbSet<Listing> Listings => Set<Listing>();
    public DbSet<ListingPhoto> ListingPhotos => Set<ListingPhoto>();
    public DbSet<ListingFavorite> ListingFavorites => Set<ListingFavorite>();
    public DbSet<SellerRating> SellerRatings => Set<SellerRating>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<Message> Messages => Set<Message>();

    // Phase 5 (05-01) Map + Groups
    public DbSet<PointOfInterest> PointsOfInterest => Set<PointOfInterest>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<GroupPost> GroupPosts => Set<GroupPost>();
    public DbSet<GroupPostImage> GroupPostImages => Set<GroupPostImage>();
    public DbSet<GroupComment> GroupComments => Set<GroupComment>();
    public DbSet<GroupPostLike> GroupPostLikes => Set<GroupPostLike>();
    public DbSet<GroupEvent> GroupEvents => Set<GroupEvent>();
    public DbSet<GroupEventRsvp> GroupEventRsvps => Set<GroupEventRsvp>();

    // Phase 6 (06-01) Auth + LGPD
    public DbSet<MagicLinkToken> MagicLinkTokens => Set<MagicLinkToken>();
    public DbSet<VerificationVouch> VerificationVouches => Set<VerificationVouch>();

    // Wave F — Business Ratings
    public DbSet<BusinessRating> BusinessRatings => Set<BusinessRating>();

    // Wave J — Business Photos
    public DbSet<BusinessPhoto> BusinessPhotos => Set<BusinessPhoto>();

    // Wave K — Profile Views (Analytics)
    public DbSet<ProfileView> ProfileViews => Set<ProfileView>();

    // Wave O — Group Polls (enquetes)
    public DbSet<GroupPoll> GroupPolls => Set<GroupPoll>();
    public DbSet<GroupPollOption> GroupPollOptions => Set<GroupPollOption>();
    public DbSet<GroupPollVote> GroupPollVotes => Set<GroupPollVote>();

    // Wave P — WhatsApp Directory + Condominiums (diferencial Meu Vizinho)
    public DbSet<WhatsAppGroup> WhatsAppGroups => Set<WhatsAppGroup>();
    public DbSet<Condominium> Condominiums => Set<Condominium>();
    public DbSet<CondominiumClaim> CondominiumClaims => Set<CondominiumClaim>();

    // Wave Q — Alertas de Segurança Geolocalizados
    public DbSet<SecurityAlert> SecurityAlerts => Set<SecurityAlert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.DisplayName).HasMaxLength(100);
            entity.Property(e => e.PhotoUrl).HasMaxLength(500);
            entity.Property(e => e.Bio).HasMaxLength(160);
            entity.Property(e => e.IsVerified).HasDefaultValue(false);
            entity.Property(e => e.IsAdmin).HasDefaultValue(false);
            entity.Property(e => e.AcceptedTermsVersion).HasMaxLength(20);
            entity.Property(e => e.IsBusinessAccount).HasDefaultValue(false);
            entity.Property(e => e.BusinessName).HasMaxLength(120);
            entity.Property(e => e.BusinessCategory).HasMaxLength(80);
            entity.Property(e => e.BusinessDescription).HasMaxLength(500);
            entity.Property(e => e.BusinessPhone).HasMaxLength(30);
            entity.Property(e => e.BusinessWebsite).HasMaxLength(200);
            entity.Property(e => e.ExpoPushToken).HasMaxLength(200);
            entity.HasOne(e => e.Bairro)
                .WithMany()
                .HasForeignKey(e => e.BairroId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.Property(e => e.EmailConfirmed).HasDefaultValue(false);
            entity.Property(e => e.FailedLoginAttempts).HasDefaultValue(0);
            entity.Property(e => e.AcceptedPrivacyPolicyVersion).HasDefaultValue(1);
            entity.Property(e => e.Plan).HasMaxLength(50).HasDefaultValue("free");
            entity.HasIndex(e => new { e.Plan, e.PlanExpiresAt }).HasDatabaseName("IX_Users_Plan_PlanExpiresAt");
            entity.HasQueryFilter(u => u.IsActive);
        });

        // RefreshToken
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired();
            entity.HasIndex(e => e.Token);
            entity.Property(e => e.CreatedByIp).IsRequired().HasMaxLength(45);
            entity.Property(e => e.RevokedByIp).HasMaxLength(45);
            entity.Property(e => e.IsRevoked).HasDefaultValue(false);
            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AuditLog
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Action).IsRequired().HasMaxLength(200);
            entity.Property(e => e.EntityType).HasMaxLength(100);
            entity.Property(e => e.EntityId).HasMaxLength(100);
            entity.Property(e => e.UserEmail).HasMaxLength(256);
            entity.Property(e => e.IpAddress).IsRequired().HasMaxLength(45);
            entity.Property(e => e.Details).HasMaxLength(2000);
            entity.Property(e => e.Timestamp).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(e => e.Timestamp);
        });

        // Bairro
        modelBuilder.Entity<Bairro>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nome).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Cidade).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Uf).IsRequired().HasMaxLength(2);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(140);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        // Verification
        modelBuilder.Entity<Verification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Cep).IsRequired().HasMaxLength(9);
            entity.Property(e => e.Logradouro).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Numero).HasMaxLength(20);
            entity.Property(e => e.ProofFilePath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ProofSha256).IsRequired().HasMaxLength(64);
            entity.HasIndex(e => e.ProofSha256);
            entity.HasIndex(e => new { e.UserId, e.Status });
            // DocumentRetentionService filters Approved + ReviewedAt < cutoff every hour
            entity.HasIndex(e => new { e.Status, e.ReviewedAt });
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.RejectionReason).HasMaxLength(500);
            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Bairro)
                .WithMany()
                .HasForeignKey(e => e.BairroId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(v => !v.IsDeleted);
        });

        // Post
        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Body).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.IsFlagged).HasDefaultValue(false);
            entity.Property(e => e.IsPublished).HasDefaultValue(true);
            entity.Property(e => e.RestrictedToVerified).HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Author)
                .WithMany()
                .HasForeignKey(e => e.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Bairro)
                .WithMany()
                .HasForeignKey(e => e.BairroId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.BairroId, e.CreatedAt });
            entity.HasIndex(e => e.Body);
            entity.HasQueryFilter(p => p.DeletedAt == null);
        });

        // PostImage
        modelBuilder.Entity<PostImage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Url).IsRequired().HasMaxLength(500);
            entity.HasOne(e => e.Post)
                .WithMany(p => p.Images)
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.PostId, e.Order }).IsUnique();
        });

        // Comment
        modelBuilder.Entity<Comment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Body).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author)
                .WithMany()
                .HasForeignKey(e => e.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(e => e.ParentCommentId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.PostId);
            entity.HasQueryFilter(c => c.DeletedAt == null);
        });

        // PostLike
        modelBuilder.Entity<PostLike>(entity =>
        {
            entity.HasKey(e => new { e.PostId, e.UserId });
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Post)
                .WithMany(p => p.Likes)
                .HasForeignKey(e => e.PostId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Report
        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TargetType).IsRequired().HasMaxLength(16);
            entity.Property(e => e.Reason).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(16).HasDefaultValue("pending");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Reporter)
                .WithMany()
                .HasForeignKey(e => e.ReporterId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => e.Status);
        });

        // Notification
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(16);
            entity.Property(e => e.IsRead).HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Actor)
                .WithMany()
                .HasForeignKey(e => e.ActorUserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.UserId, e.IsRead });
        });

        // ─── Phase 4: Listing ───
        modelBuilder.Entity<Listing>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Price).HasColumnType("decimal(12,2)");
            entity.Property(e => e.CategoryCode).IsRequired().HasMaxLength(40);
            entity.Property(e => e.SubcategoryCode).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(16).HasDefaultValue("active");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Seller)
                .WithMany()
                .HasForeignKey(e => e.SellerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Bairro)
                .WithMany()
                .HasForeignKey(e => e.BairroId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.BairroId, e.Status, e.CreatedAt });
            entity.HasIndex(e => e.SellerId);
            entity.HasIndex(e => new { e.Status, e.ExpiresAt }).HasDatabaseName("IX_Listings_Status_ExpiresAt");
            entity.HasQueryFilter(l => l.DeletedAt == null);
            entity.Property(e => e.RowVersion).IsRowVersion();
        });

        // ─── ListingPhoto ───
        modelBuilder.Entity<ListingPhoto>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.StoragePath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ThumbnailPath).IsRequired().HasMaxLength(500);
            entity.HasOne(e => e.Listing)
                .WithMany(l => l.Photos)
                .HasForeignKey(e => e.ListingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.ListingId, e.OrderIndex }).IsUnique();
        });

        // ─── ListingFavorite ───
        modelBuilder.Entity<ListingFavorite>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.SnapshotPrice).HasColumnType("decimal(12,2)");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Listing)
                .WithMany()
                .HasForeignKey(e => e.ListingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.ListingId, e.UserId }).IsUnique();
        });

        // ─── SellerRating ───
        modelBuilder.Entity<SellerRating>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Comment).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Seller)
                .WithMany()
                .HasForeignKey(e => e.SellerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Buyer)
                .WithMany()
                .HasForeignKey(e => e.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Listing)
                .WithMany()
                .HasForeignKey(e => e.ListingId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.SellerId, e.DeletedByAdminAt });
            entity.HasIndex(e => new { e.BuyerId, e.ListingId }).IsUnique();
        });

        // ─── Conversation ───
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Listing)
                .WithMany()
                .HasForeignKey(e => e.ListingId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Buyer)
                .WithMany()
                .HasForeignKey(e => e.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Seller)
                .WithMany()
                .HasForeignKey(e => e.SellerId)
                .OnDelete(DeleteBehavior.Restrict);
            // Listing-based conversations: unique per (ListingId, BuyerId, SellerId) where listing exists
            entity.HasIndex(e => new { e.ListingId, e.BuyerId, e.SellerId })
                .IsUnique()
                .HasFilter("[ListingId] IS NOT NULL");
            // Direct conversations: unique per (BuyerId, SellerId) where no listing
            entity.HasIndex(e => new { e.BuyerId, e.SellerId })
                .IsUnique()
                .HasFilter("[ListingId] IS NULL");
            entity.HasIndex(e => e.LastMessageAt);
        });

        // ─── ConversationParticipant (composite key) ───
        modelBuilder.Entity<ConversationParticipant>(entity =>
        {
            entity.HasKey(e => new { e.ConversationId, e.UserId });
            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Participants)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.UserId, e.LastReadAt });
        });

        // ─── Message ───
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Text).HasMaxLength(2000);
            entity.Property(e => e.ImagePath).HasMaxLength(500);
            entity.Property(e => e.SentAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Sender)
                .WithMany()
                .HasForeignKey(e => e.SenderId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.ConversationId, e.SentAt });
            entity.HasQueryFilter(m => m.DeletedAt == null);
        });

        // Phase 5 — User map preference
        modelBuilder.Entity<User>()
            .Property(u => u.ShowOnMap).HasDefaultValue(true);

        // Phase 5 — Bairro centroids
        modelBuilder.Entity<Bairro>()
            .Property(b => b.CentroidLat).IsRequired(false);
        modelBuilder.Entity<Bairro>()
            .Property(b => b.CentroidLng).IsRequired(false);

        // Phase 5 — POI
        modelBuilder.Entity<PointOfInterest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Name).HasMaxLength(120).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(40);
            entity.HasOne(e => e.Bairro).WithMany().HasForeignKey(e => e.BairroId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.CreatedByUser).WithMany().HasForeignKey(e => e.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 5 — Group
        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(40);
            entity.Property(e => e.JoinPolicy).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Scope).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Rules).HasMaxLength(2000);
            entity.Property(e => e.CoverImageUrl).HasMaxLength(500);
            entity.HasOne(e => e.Bairro).WithMany().HasForeignKey(e => e.BairroId).OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 5 — GroupMember
        modelBuilder.Entity<GroupMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Role).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.NotificationPreference).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => new { e.GroupId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Group).WithMany(g => g.Members).HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 5 — GroupPost (SEPARATE from Post, no global query filter)
        modelBuilder.Entity<GroupPost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Body).HasMaxLength(2000).IsRequired();
            entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(40);
            entity.HasOne(e => e.Group).WithMany(g => g.Posts).HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorId).OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 5 — GroupPostImage
        modelBuilder.Entity<GroupPostImage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Url).HasMaxLength(500).IsRequired();
            entity.HasOne(e => e.GroupPost).WithMany(p => p.Images).HasForeignKey(e => e.GroupPostId).OnDelete(DeleteBehavior.Cascade);
        });

        // Phase 5 — GroupComment
        modelBuilder.Entity<GroupComment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Body).HasMaxLength(1000).IsRequired();
            entity.HasOne(e => e.GroupPost).WithMany(p => p.Comments).HasForeignKey(e => e.GroupPostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ParentComment).WithMany().HasForeignKey(e => e.ParentCommentId).OnDelete(DeleteBehavior.NoAction);
        });

        // Phase 5 — GroupPostLike
        modelBuilder.Entity<GroupPostLike>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.HasIndex(e => new { e.GroupPostId, e.UserId }).IsUnique();
            entity.HasOne(e => e.GroupPost).WithMany(p => p.Likes).HasForeignKey(e => e.GroupPostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 5 — GroupEvent
        modelBuilder.Entity<GroupEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Location).HasMaxLength(300);
            entity.HasOne(e => e.Group).WithMany(g => g.Events).HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.CreatedByUser).WithMany().HasForeignKey(e => e.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            // GroupEventReminderService polls this filter every 5 minutes
            entity.HasIndex(e => new { e.ReminderSent, e.ReminderAt });
        });

        // Phase 5 — GroupEventRsvp
        modelBuilder.Entity<GroupEventRsvp>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.HasIndex(e => new { e.EventId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Event).WithMany(ev => ev.Rsvps).HasForeignKey(e => e.EventId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 6 — MagicLinkToken
        modelBuilder.Entity<MagicLinkToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(128);
            entity.HasIndex(e => e.TokenHash);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Phase 6 — VerificationVouch
        modelBuilder.Entity<VerificationVouch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(e => new { e.VoucheeId, e.VoucherId }).IsUnique();
            entity.HasOne(e => e.Vouchee)
                .WithMany()
                .HasForeignKey(e => e.VoucheeId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Voucher)
                .WithMany()
                .HasForeignKey(e => e.VoucherId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Wave J — BusinessPhoto
        modelBuilder.Entity<BusinessPhoto>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Url).IsRequired().HasMaxLength(500);
            entity.Property(e => e.DisplayOrder).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.UserId);
        });

        // Wave J — IsBanned on User
        modelBuilder.Entity<User>()
            .Property(u => u.IsBanned).HasDefaultValue(false);

        // Wave K — ProfileView
        modelBuilder.Entity<ProfileView>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.ViewerIp).HasMaxLength(64);
            entity.Property(e => e.ViewedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.BusinessUser)
                .WithMany()
                .HasForeignKey(e => e.BusinessUserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.BusinessUserId, e.ViewedAt });
        });

        // Wave F — BusinessRating
        modelBuilder.Entity<BusinessRating>(e => {
            e.HasKey(r => r.Id);
            e.Property(r => r.Id).UseIdentityColumn();
            e.Property(r => r.Comment).HasMaxLength(500);
            e.Property(r => r.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            e.HasIndex(r => new { r.RaterId, r.BusinessUserId }).IsUnique();
            e.HasOne(r => r.Rater).WithMany().HasForeignKey(r => r.RaterId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(r => r.BusinessUser).WithMany().HasForeignKey(r => r.BusinessUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Wave O — GroupPoll
        modelBuilder.Entity<GroupPoll>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Question).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasOne(e => e.Group).WithMany().HasForeignKey(e => e.GroupId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.CreatedByUser).WithMany().HasForeignKey(e => e.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.GroupId, e.CreatedAt });
        });

        // Wave O — GroupPollOption
        modelBuilder.Entity<GroupPollOption>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Text).IsRequired().HasMaxLength(100);
            entity.HasOne(e => e.Poll).WithMany(p => p.Options).HasForeignKey(e => e.GroupPollId).OnDelete(DeleteBehavior.Cascade);
        });

        // Wave O — GroupPollVote (one vote per user per poll)
        modelBuilder.Entity<GroupPollVote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.HasIndex(e => new { e.GroupPollId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Poll).WithMany(p => p.Votes).HasForeignKey(e => e.GroupPollId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Option).WithMany(o => o.Votes).HasForeignKey(e => e.GroupPollOptionId).OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 6 — User new fields config
        modelBuilder.Entity<User>()
            .Property(u => u.TotpEnabled).HasDefaultValue(false);
        modelBuilder.Entity<User>()
            .Property(u => u.DigestOptOut).HasDefaultValue(false);
        modelBuilder.Entity<User>()
            .Property(u => u.IsActive).HasDefaultValue(true);
        modelBuilder.Entity<User>()
            .HasIndex(u => u.GoogleId)
            .IsUnique()
            .HasFilter("[GoogleId] IS NOT NULL");

        // ─── Wave P: Condominium ───
        modelBuilder.Entity<Condominium>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.AddressLine).HasMaxLength(250);
            entity.Property(e => e.Cep).HasMaxLength(9);
            entity.Property(e => e.CoverImageUrl).HasMaxLength(500);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.SindicoRole).HasConversion<string>().HasMaxLength(20);
            entity.HasOne(e => e.Bairro).WithMany().HasForeignKey(e => e.BairroId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.SindicoUser).WithMany().HasForeignKey(e => e.SindicoUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.BairroId, e.Status });
            entity.HasIndex(e => new { e.BairroId, e.Name }).IsUnique().HasFilter("[DeletedAt] IS NULL");
        });

        // ─── Wave P: WhatsAppGroup (diretório verificado) ───
        modelBuilder.Entity<WhatsAppGroup>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.InviteUrl).IsRequired().HasMaxLength(300);
            entity.Property(e => e.Kind).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.CoverImageUrl).HasMaxLength(500);
            entity.Property(e => e.RejectionReason).HasMaxLength(500);
            entity.HasOne(e => e.Bairro).WithMany().HasForeignKey(e => e.BairroId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Condominium).WithMany(c => c.WhatsAppGroups).HasForeignKey(e => e.CondominiumId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.SubmittedByUser).WithMany().HasForeignKey(e => e.SubmittedByUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(e => new { e.BairroId, e.Status });
            entity.HasIndex(e => e.CondominiumId);
            entity.HasIndex(e => new { e.BairroId, e.InviteUrl }).IsUnique().HasFilter("[DeletedAt] IS NULL");
        });

        // ─── Wave P: CondominiumClaim (reivindicação de síndico) ───
        modelBuilder.Entity<CondominiumClaim>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.RequestedRole).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Justification).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.EvidenceUrl).HasMaxLength(500);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.ReviewNote).HasMaxLength(500);
            entity.HasOne(e => e.Condominium).WithMany(c => c.Claims).HasForeignKey(e => e.CondominiumId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(e => new { e.CondominiumId, e.Status });
        });

        // ─── Wave Q: SecurityAlert (alertas de segurança geolocalizados) ───
        modelBuilder.Entity<SecurityAlert>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).UseIdentityColumn();
            entity.Property(e => e.Kind).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.LocationDescription).HasMaxLength(300);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.ResolutionNote).HasMaxLength(500);
            entity.HasOne(e => e.Bairro).WithMany().HasForeignKey(e => e.BairroId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ReportedByUser).WithMany().HasForeignKey(e => e.ReportedByUserId).OnDelete(DeleteBehavior.SetNull);
            // Índice principal: listagem por bairro + status (mais frequente).
            entity.HasIndex(e => new { e.BairroId, e.Status });
            // Índice temporal para ordenação reverse-chrono.
            entity.HasIndex(e => new { e.BairroId, e.CreatedAt });
        });
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<User>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
        return await base.SaveChangesAsync(cancellationToken);
    }
}
