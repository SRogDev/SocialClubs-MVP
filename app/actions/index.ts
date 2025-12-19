/**
 * Actions Index - Centralized export of all server actions
 * Patrón Repository: Actions llaman a services, services contienen CRUD
 */

// Club Actions
export {
    updateClubAction,
    joinClubAction,
    leaveClubAction,
} from './clubActions'

// Post Actions
export {
    createPostAction,
    updatePostAction,
    deletePostAction,
    addCommentAction,
    likePostAction,
    unlikePostAction,
    superlikePostAction,
} from './postActions'

// Profile Actions
export {
    updateProfileAction,
    uploadProfileImageAction,
} from './profileActions'

// Admin Actions
export {
    banClubAction,
    warnCreatorAction,
    exportMetricsAction,
    sendMarketingEmailAction,
} from './adminActions'
