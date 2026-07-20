// ============================================================
// src/services/index.ts  — barrel re-export
// ============================================================
export { usersService       } from './users.service'
export { eventsService      } from './events.service'
export { invitationsService } from './invitations.service'
export { checkinsService    } from './checkins.service'
// Legacy aliases kept for backward compatibility with pages
export { authService        } from './auth.service'
export { excelService       } from './excel.service'
