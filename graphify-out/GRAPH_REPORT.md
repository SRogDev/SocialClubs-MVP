# Graph Report — SocialClubs-MVP  (2026-10-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2901 nodes · 8101 edges · 124 communities (113 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 110
- Community 111
- Community 112
- Community 114
- Community 115
- Community 116
- Community 117
- Community 120

## God Nodes (most connected - your core abstractions)
1. `cn()` - 467 edges
2. `createClient()` - 303 edges
3. `Button()` - 217 edges
4. `react` - 191 edges
5. `lucide-react` - 152 edges
6. `next` - 117 edges
7. `Card()` - 102 edges
8. `CardContent()` - 98 edges
9. `CardHeader()` - 68 edges
10. `CardTitle()` - 64 edges

## Surprising Connections (you probably didn't know these)
- `ClubJsonLdProps` --references--> `Club`  [EXTRACTED]
  components/club-json-ld.tsx → types/club.ts
- `NotificationsResponse` --references--> `Notification`  [EXTRACTED]
  hooks/swr/useNotifications.ts → types/notification.ts
- `FeedClubCardProps` --references--> `Club`  [EXTRACTED]
  components/explore/feed-club-card.tsx → types/club.ts
- `FeedClubsProps` --references--> `Club`  [EXTRACTED]
  components/explore/feed-clubs.tsx → types/club.ts
- `ClubHeaderProps` --references--> `Club`  [EXTRACTED]
  components/club/club-header.tsx → types/club.ts

## Import Cycles
- None detected.

## Communities (124 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (96): ContextContent(), InlineCitationCardBody(), InlineCitationCardTrigger(), AttachmentsContext, LocalAttachmentsContext, PromptInputActionAddAttachments(), PromptInputActionAddAttachmentsProps, PromptInputActionMenu() (+88 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (85): ChainOfThought, ChainOfThoughtContent, ChainOfThoughtContentProps, ChainOfThoughtContext, ChainOfThoughtContextValue, ChainOfThoughtHeader, ChainOfThoughtHeaderProps, ChainOfThoughtImage (+77 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (72): Conversation(), ConversationContent(), ConversationContentProps, ConversationEmptyState(), ConversationEmptyStateProps, ConversationProps, ConversationScrollButton(), ConversationScrollButtonProps (+64 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (86): dependencies, ai, @ai-sdk/google, @ai-sdk/react, class-variance-authority, clsx, cmdk, crisp-sdk-web (+78 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (63): getAuthUser(), interactWithWidgetAction(), publishWidgetAction(), updateWidgetDataAction(), GET(), handleSubmit(), CountdownDisplay(), ICON_MAP (+55 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (43): cancelVideoUploadAction(), AgendaPage(), ClubsFilters(), ClubsFiltersProps, ConfigLine(), ConfigLineProps, ConfigOptions(), AgentData (+35 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (42): sendMarketingEmailAction(), ErrorContent(), Page(), Page(), PageProps, MonetizationPage(), MonetizationPageProps, SupportPage() (+34 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (35): AuthButton(), LogoutButton(), SalesButton(), SalesButtonProps, FEATURES, SalesCard(), SalesCardProps, SalesExample() (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (43): getAgentMetaAction(), saveAgentConfigAction(), POST(), AgentPage(), ConfigOptionsProps, MainConfigProps, @ai-sdk/google, @hookform/resolvers (+35 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (32): GET(), GET(), GET(), POST(), GET(), AnaliticasPage(), AutomatizarPage(), mockChannels (+24 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (37): ClubInfoContent(), ClubInfoPage(), mockClub, mockUser, ModelSelectorContent(), ContentCreationBar(), ContentCreationBarProps, ClubCreationWizard() (+29 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (34): DELETE(), GET(), POST(), POST(), POST(), POST(), DELETE(), DELETE() (+26 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (43): Artifact(), ArtifactAction(), ArtifactActionProps, ArtifactActions(), ArtifactActionsProps, ArtifactClose(), ArtifactCloseProps, ArtifactContent() (+35 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (36): DELETE(), PATCH(), GET(), POST(), GET(), POST(), POST(), useAppointmentActions() (+28 more)

### Community 14 - "Community 14"
Cohesion: 0.04
Nodes (41): private, autoprefixer, cmdk, @daily-co/daily-js, @daily-co/daily-react, eslint, eslint-config-prettier, @eslint/eslintrc (+33 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (37): AdminLayout(), adminMenuItems, AdminSidebar(), SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader() (+29 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (31): POST(), GET(), limiter, limiter, POST(), GET(), POST(), handleAccountUpdated() (+23 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (40): ModelSelector(), ModelSelectorContentProps, ModelSelectorDialog(), ModelSelectorDialogProps, ModelSelectorEmpty(), ModelSelectorEmptyProps, ModelSelectorGroup(), ModelSelectorGroupProps (+32 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (29): AdminDashboard(), ChartWrapper(), ChartWrapperProps, DashboardMetrics(), DashboardMetricsProps, AnimatedNumber(), MetricCard(), MetricCardProps (+21 more)

### Community 19 - "Community 19"
Cohesion: 0.09
Nodes (27): Page(), AboutSection(), ClosingSection(), ClubScrollSection, ClubScrollSectionLazy(), EcosystemSection(), OrbitIcon(), OrbitIconProps (+19 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (36): Checkpoint(), MessageActionProps, MessageActions(), MessageActionsProps, MessageAttachmentProps, MessageAttachments(), MessageAttachmentsProps, MessageBranch() (+28 more)

### Community 21 - "Community 21"
Cohesion: 0.05
Nodes (36): button, buttonContainer, contactBox, contactText, container, content, detailLabel, detailRow (+28 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (22): ChatContentCreationBar(), ChatContentCreationBarProps, PreviewImage(), PreviewImageProps, Properties, TextMessageModal(), ThemeSwitcher(), DropdownMenu() (+14 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (28): joinClubAction(), AgentPanelClient(), AgentPanelClientProps, AgentTabsTransition(), AgentTabsTransitionProps, ClubPageClient(), ClubPageClientProps, WelcomeClubMessage (+20 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (17): CreateClubPage(), CreateClubSkeleton(), manrope, metadata, RootLayout(), CookieBanner(), ErrorBoundaryClass, ErrorBoundaryProps (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (34): Node(), NodeAction(), NodeActionProps, NodeContent(), NodeContentProps, NodeDescription(), NodeDescriptionProps, NodeFooter() (+26 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (25): warnCreatorAction(), ClubGestionPage(), MarketingPage(), ModerationPage(), ClubModerationCard(), ClubModerationCardProps, ClubsGrid(), ReportsSummary() (+17 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (26): PollForm(), mostrarNotificacion(), onSubmit(), PollFormProps, QuestionOptions, FormControl, FormDescription, FormField() (+18 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (25): Controls(), ControlsProps, Loader(), LoaderIcon(), LoaderIconProps, LoaderProps, Panel(), PanelProps (+17 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (31): OpenIn(), OpenInChatGPT(), OpenInChatGPTProps, OpenInClaude(), OpenInClaudeProps, OpenInContent(), OpenInContentProps, OpenInContext (+23 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (26): WelcomeClubMessageProps, Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle (+18 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (25): createGamificationAction(), createGamificationReward(), deleteGamificationAction(), deleteGamificationReward(), getClubGamificationActions, getClubLeaderboard, getClubRewards, getRewardById() (+17 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (26): ClubBannedPage(), ClubBannedPageProps, AppealButton(), AppealButtonProps, Confirmation(), ConfirmationAccepted(), ConfirmationAcceptedProps, ConfirmationAction() (+18 more)

### Community 33 - "Community 33"
Cohesion: 0.06
Nodes (29): benefitItem, benefitsBox, button, buttonContainer, container, content, detailLabel, detailRow (+21 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (21): uploadLogo(), PostActions(), PostActionsProps, PostAudio(), PostAudioProps, PostHeader(), PostImage(), PostImageProps (+13 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (22): DashboardExportButton(), ExportButton(), ExportButtonProps, MainConfig(), ConnectButton(), ConnectButtonProps, ConnectDashboardButton(), ConnectDashboardButtonProps (+14 more)

### Community 36 - "Community 36"
Cohesion: 0.09
Nodes (26): CarouselApiContext, InlineCitation(), InlineCitationCardBodyProps, InlineCitationCardProps, InlineCitationCardTriggerProps, InlineCitationCarousel(), InlineCitationCarouselContentProps, InlineCitationCarouselHeader() (+18 more)

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (22): leaveClubAction(), updateClubAction(), POST(), UseClubCreateResult, ClubInput, clubSchema, CreateClubInput, createClubSchema (+14 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (20): updateProfileAction(), uploadProfileImageAction(), GET(), generateUploadAuthParams(), IK_FOLDERS, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT (+12 more)

### Community 39 - "Community 39"
Cohesion: 0.13
Nodes (15): banClubAction(), exportMetricsAction(), GET(), GET(), GET(), GET(), GET(), banClub() (+7 more)

### Community 40 - "Community 40"
Cohesion: 0.16
Nodes (18): deleteNotificationAction(), markAllNotificationsReadAction(), markNotificationReadAction(), metadata, NotificationCenter(), NotificationItem(), NotificationItemProps, timeAgo() (+10 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (22): CodeBlock(), CodeBlockContext, CodeBlockContextType, CodeBlockCopyButton(), CodeBlockCopyButtonProps, CodeBlockProps, highlightCode(), lineNumberTransformer (+14 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (24): ContextCacheUsage(), ContextCacheUsageProps, ContextContentBody(), ContextContentBodyProps, ContextContentFooter(), ContextContentFooterProps, ContextContentHeaderProps, ContextContentProps (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (18): FloatingJoinButton(), FloatingJoinButtonProps, SubscriptionCard(), SubscriptionCardProps, ClubHighlights(), ClubHighlightsProps, Highlight, reviews (+10 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (23): CommentInput, commentSchema, CreatePostInput, createPostSchema, PollInput, PollOptionInput, pollOptionSchema, pollSchema (+15 more)

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (21): addCommentAction(), createPostAction(), deletePostAction(), likePostAction(), superlikePostAction(), unlikePostAction(), updatePostAction(), invalidatePostStatsCache() (+13 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (17): createVideoUploadAction(), mux, POST(), @mux/mux-node, CreateVideoUploadInput, createVideoUploadSchema, MuxVideoMetadata, muxVideoMetadataSchema (+9 more)

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (19): GET(), POST(), POST(), VideocallPage(), VideocallPageProps, createVideocallRoomSchema, getUpcomingBookings(), createDailyRoom() (+11 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (16): ClubInfoPage(), PageProps, ClubDescription(), ClubDescriptionProps, ClubEditButton(), ClubEditButtonProps, ClubHeader(), ClubRewards() (+8 more)

### Community 49 - "Community 49"
Cohesion: 0.11
Nodes (10): mockClub, PanelLayout(), metadata, metadata, ClubPanelSidebar(), SidebarProps, ClubPanelSidebarWrapper(), ClubPanelSidebarWrapperProps (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (22): alertBox, alertDescription, alertText, BanClubEmailProps, button, buttonContainer, container, content (+14 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (22): actionBox, actionItem, cautionText, contactBox, contactText, container, content, divider (+14 more)

### Community 52 - "Community 52"
Cohesion: 0.09
Nodes (22): devDependencies, autoprefixer, eslint, eslint-config-next, eslint-config-prettier, @eslint/eslintrc, eslint-plugin-prettier, husky (+14 more)

### Community 53 - "Community 53"
Cohesion: 0.13
Nodes (20): ChangePasswordInput, changePasswordSchema, emailSchema, passwordSchema, ResetPasswordInput, resetPasswordSchema, SignInInput, signInSchema (+12 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (21): AwardPointsInput, awardPointsSchema, bountySchema, ClaimRewardInput, claimRewardSchema, CreateGamificationActionInput, createGamificationActionSchema, CreateGamificationRewardInput (+13 more)

### Community 55 - "Community 55"
Cohesion: 0.19
Nodes (12): Page(), Page(), Page(), PageProps, Page(), ForgotPasswordForm(), GuestButton(), LoginForm() (+4 more)

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (14): ExploreContent(), ExplorePage(), FeaturedClubsSkeleton(), FeedClubsSkeleton(), ExploreSpotlightWrapper(), FeedClubCard, FeedClubCardInner(), FeedClubCardProps (+6 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (17): ChatLine(), ChatLineProps, MainChat(), MainChatProps, ThinkingDots(), Message(), MessageContent(), PromptInput() (+9 more)

### Community 58 - "Community 58"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 59 - "Community 59"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+11 more)

### Community 60 - "Community 60"
Cohesion: 0.18
Nodes (13): CheckIcon(), CodeBlock(), CopyIcon(), ConnectSupabaseSteps(), client, create, FetchDataSteps(), rls (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.18
Nodes (10): ClubCard(), ClubCardProps, FeaturedClubCard(), FeaturedClubCardProps, FeaturedClubs(), FeaturedClubsProps, zustand, ClubStore (+2 more)

### Community 62 - "Community 62"
Cohesion: 0.21
Nodes (12): PwaInstallBanner(), PwaInstallBannerProps, ClubVisitorCTA(), ClubVisitorCTAProps, DailyVideoContainer(), DailyVideoContainerProps, BeforeInstallPromptEvent, isPWA() (+4 more)

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (14): fetcher(), useAppointments(), useAvailableSlots(), fetcher(), UseBookingsOptions, useClubBookings(), useUpcomingBookings(), useUserBookings() (+6 more)

### Community 64 - "Community 64"
Cohesion: 0.12
Nodes (15): createPlanSchema, POST(), MIN_SUBSCRIPTION_PRICE_CENTS, zod, CreateNotificationInput, createNotificationSchema, MarkAllReadInput, markAllReadSchema (+7 more)

### Community 65 - "Community 65"
Cohesion: 0.27
Nodes (14): fetcher(), useAdminClubs(), useAdminMetrics(), useClubsWithReports(), useMarketingStats(), fetcher(), useClub(), useClubMembers() (+6 more)

### Community 66 - "Community 66"
Cohesion: 0.23
Nodes (12): createAdminClient(), chunkText(), clearRagChunksBySource(), createRagSource(), deleteRagSource(), getClubRagUsageBytes(), getRagSourceById(), markRagSourceStatus() (+4 more)

### Community 67 - "Community 67"
Cohesion: 0.16
Nodes (15): InlineCitationCarouselContent(), InlineCitationCarouselItem(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext() (+7 more)

### Community 68 - "Community 68"
Cohesion: 0.12
Nodes (15): ClubBalance, ConnectedStripeAccount, Payment, TransactionDirection, IN, OUT, TransactionStatus, COMPLETED (+7 more)

### Community 69 - "Community 69"
Cohesion: 0.19
Nodes (9): ClubHeader(), ClubHeaderProps, ClubCard(), ClubCardProps, ClubLevelBadge(), ClubLevelBadgeProps, sizeConfig, Card3D() (+1 more)

### Community 70 - "Community 70"
Cohesion: 0.21
Nodes (13): CommentSkeleton(), CommentsModal(), CommentsModalProps, CurrentUser, fetcher(), formatRelativeTime(), RichComment, OverlayButtonsProps (+5 more)

### Community 71 - "Community 71"
Cohesion: 0.21
Nodes (10): Seo(), SeoProps, generateJsonLd(), siteConfig, ClubJsonLd, formatKeywords(), generateClubJsonLd(), getLogoUrl() (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.21
Nodes (11): fetcher(), useAppointment(), useAppointments(), fetcher(), useBooking(), useBookings(), EarningsData, fetcher() (+3 more)

### Community 73 - "Community 73"
Cohesion: 0.20
Nodes (11): POST(), SupabaseWebhookPayload, getNestedValue(), interpolate(), NotificationType, RenderedTemplate, renderTemplate(), send() (+3 more)

### Community 74 - "Community 74"
Cohesion: 0.25
Nodes (10): GET(), fetchLeaderboardFromDB(), getLeaderboardWithCache(), fetchPostStatsFromDB(), getPostStatsWithCache(), CacheKey, redis, TTL (+2 more)

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (9): ClubAdminCard(), ClubAdminCardProps, ClubsGridProps, StatusBadge(), StatusBadgeProps, ClubHeaderProps, Badge(), badgeVariants (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.15
Nodes (11): InteractionType, LIKE, SUPERLIKE, PostInteraction, PostTypes, AUDIO, IMAGE, POLL (+3 more)

### Community 77 - "Community 77"
Cohesion: 0.26
Nodes (9): NotificationBell(), NotificationBellProps, DockItem(), FloatingDock(), NAV_ITEMS, fetcher(), NotificationsResponse, useNotifications() (+1 more)

### Community 78 - "Community 78"
Cohesion: 0.15
Nodes (12): background_color, categories, description, display, icons, name, orientation, screenshots (+4 more)

### Community 79 - "Community 79"
Cohesion: 0.15
Nodes (3): @testing-library/jest-dom, @testing-library/react, localStorageMock

### Community 80 - "Community 80"
Cohesion: 0.20
Nodes (6): CanvasProps, Animated(), Edge, getEdgeParams(), getHandleCoordsByPosition(), @xyflow/react

### Community 81 - "Community 81"
Cohesion: 0.33
Nodes (8): ChatMessageItem(), ChatMessageItemProps, RealtimeChat(), RealtimeChatProps, useChatScroll(), ChatMessage, useRealtimeChat(), UseRealtimeChatProps

### Community 82 - "Community 82"
Cohesion: 0.35
Nodes (10): TransactionHistory(), TransactionHistoryProps, Table, TableBody, TableCaption, TableCell, TableFooter, TableHead (+2 more)

### Community 83 - "Community 83"
Cohesion: 0.29
Nodes (8): LevelUpCelebration(), LevelUpCelebrationProps, AppShell(), HIDDEN_NAV_ROUTES, DesktopSidebar(), NAV_ITEMS, useClubLevelListener(), LevelUpMetadata

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (9): getReceiver(), POST(), invalidateLeaderboardCache(), GamificationJobPayload, qstashClient, @upstash/qstash, awardPoints(), getClubActionRule() (+1 more)

### Community 85 - "Community 85"
Cohesion: 0.29
Nodes (9): POST(), resend, POST(), resend, BanClubEmail(), WarningClubEmail(), @react-email/render, resend (+1 more)

### Community 86 - "Community 86"
Cohesion: 0.36
Nodes (10): activateSubscription(), cancelSubscription(), getInvoiceSubscriptionId(), handleCheckoutCompleted(), handleConnectAccountUpdated(), handleInvoicePaid(), handleInvoicePaymentFailed(), handleSubscriptionUpdated() (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.31
Nodes (8): ClubData(), ClubPage(), PageProps, ClubPageSkeleton(), SidebarMenuSkeleton, Skeleton(), isUserClubMember, getPosts

### Community 88 - "Community 88"
Cohesion: 0.22
Nodes (7): compressImage(), Channel, FormData, steps, Template, useClubCreate(), UseClubDeleteResult

### Community 89 - "Community 89"
Cohesion: 0.29
Nodes (7): ClubActions(), ClubActionsProps, ClubInteractiveWrapper(), ClubInteractiveWrapperProps, NotificationsToggle(), NotificationsToggleProps, Switch

### Community 90 - "Community 90"
Cohesion: 0.31
Nodes (10): fetcher(), useClubPosts(), usePost(), usePostComments(), usePostStats(), useTrendingPosts(), useUserPostInteractions(), useUserPosts() (+2 more)

### Community 91 - "Community 91"
Cohesion: 0.27
Nodes (6): updateSession(), hasEnvVars, config, proxy(), setSecurityHeaders(), @supabase/ssr

### Community 92 - "Community 92"
Cohesion: 0.29
Nodes (8): Channel, ChannelType, ESCALONADO, EXTRA, ChatMessage, ClubAgent, ClubBadge, ClubStats

### Community 93 - "Community 93"
Cohesion: 0.27
Nodes (9): bullets, ClubScrollSection(), FEATURE_ICONS, FeatureOrb(), HubSphere(), Scene(), @react-three/drei, @react-three/fiber (+1 more)

### Community 94 - "Community 94"
Cohesion: 0.20
Nodes (5): CachedClub, CachedPost, CachedUser, db, DraftPost

### Community 95 - "Community 95"
Cohesion: 0.20
Nodes (9): buildCommand, crons, devCommand, env, framework, ignoreCommand, installCommand, outputDirectory (+1 more)

### Community 96 - "Community 96"
Cohesion: 0.36
Nodes (7): ClubsList(), ClubsPage(), HomeListSkeleton(), ClubDisplayData, HomeList, HomeListProps, getUserClubs

### Community 97 - "Community 97"
Cohesion: 0.39
Nodes (6): WidgetModalProps, ICON_MAP, WidgetSelectorProps, PLATFORM_WIDGETS, WidgetRegistryEntry, WidgetSchema

### Community 98 - "Community 98"
Cohesion: 0.28
Nodes (4): @playwright/test, login(), logout(), waitForNavigation()

### Community 99 - "Community 99"
Cohesion: 0.28
Nodes (3): PineconeRagProvider, RagVectorProvider, UpsertRagChunkInput

### Community 100 - "Community 100"
Cohesion: 0.43
Nodes (5): ClubPageExample(), generateMetadata(), ClubJsonLd(), ClubJsonLdProps, getClubById

### Community 101 - "Community 101"
Cohesion: 0.43
Nodes (5): OneSignalProvider(), useOneSignalAuth(), linkUser(), initOneSignal(), react-onesignal

### Community 102 - "Community 102"
Cohesion: 0.46
Nodes (7): decodeUtf8(), downloadStorageObject(), extractTextByMime(), extractTextFromRagSource(), parseStoragePath(), sanitizePdfText(), stripHtmlTags()

### Community 103 - "Community 103"
Cohesion: 0.38
Nodes (5): ContextContentHeader(), ProgressAnimated(), ProgressAnimatedProps, Progress(), @radix-ui/react-progress

### Community 104 - "Community 104"
Cohesion: 0.52
Nodes (6): fetcher(), useCurrentUser(), useUser(), useUserByUsername(), useUserMemberships(), useUserPoints()

### Community 105 - "Community 105"
Cohesion: 0.29
Nodes (6): Membership, MembershipStatus, ACTIVE, CANCELLED, EXPIRED, UserMembership

### Community 106 - "Community 106"
Cohesion: 0.73
Nodes (4): signInAsGuest(), generateFakeProfileData(), generateGuestEmail(), generateRandomPassword()

### Community 107 - "Community 107"
Cohesion: 0.40
Nodes (3): Template, TemplateSelection(), TemplateSelectionProps

### Community 108 - "Community 108"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 110 - "Community 110"
Cohesion: 0.67
Nodes (3): getReceiver(), POST(), ragIngestionJobSchema

### Community 111 - "Community 111"
Cohesion: 0.50
Nodes (3): config, createJestConfig, jest

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (4): @types/react, @types/react-dom, pnpm, overrides

### Community 114 - "Community 114"
Cohesion: 0.67
Nodes (3): Context(), InlineCitationCard(), HoverCard()

## Knowledge Gaps
- **928 isolated node(s):** `AttachmentsContext`, `PromptInputActionAddAttachmentsProps`, `PromptInputActionMenuContentProps`, `PromptInputActionMenuItemProps`, `PromptInputActionMenuProps` (+923 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1065 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 24` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 48`, `Community 49`, `Community 55`, `Community 56`, `Community 57`, `Community 60`, `Community 62`, `Community 67`, `Community 69`, `Community 70`, `Community 75`, `Community 77`, `Community 80`, `Community 81`, `Community 82`, `Community 83`, `Community 87`, `Community 88`, `Community 89`, `Community 93`, `Community 96`, `Community 97`, `Community 101`, `Community 103`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **What connects `AttachmentsContext`, `PromptInputActionAddAttachmentsProps`, `PromptInputActionMenuContentProps` to the rest of the system?**
  _928 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.024645257654966394 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `Community 2` to `Community 0`, `Community 1`, `Community 5`, `Community 6`, `Community 7`, `Community 10`, `Community 12`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 32`, `Community 36`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 48`, `Community 49`, `Community 55`, `Community 56`, `Community 57`, `Community 60`, `Community 67`, `Community 69`, `Community 70`, `Community 75`, `Community 77`, `Community 81`, `Community 82`, `Community 83`, `Community 87`, `Community 89`, `Community 103`?**
  _High betweenness centrality (0.203) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.030100334448160536 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `Community 9` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 11`, `Community 13`, `Community 15`, `Community 16`, `Community 23`, `Community 26`, `Community 31`, `Community 32`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 53`, `Community 56`, `Community 64`, `Community 66`, `Community 74`, `Community 84`, `Community 85`, `Community 86`, `Community 87`, `Community 96`, `Community 100`, `Community 106`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.038662486938349006 - nodes in this community are weakly interconnected._