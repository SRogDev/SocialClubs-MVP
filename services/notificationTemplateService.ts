/**
 * Notification Template Service
 *
 * Loads JSON templates, renders variables (including nested), and sends
 * push notifications via the OneSignal REST API.
 *
 * Usage (server-side only — requires ONESIGNAL_REST_API_KEY):
 *   import { send } from '@/services/notificationTemplateService';
 *   await send('new_message_club', { clubName: 'Dev Hub', senderName: 'Ana', messagePreview: 'Hey!' }, ['user-uuid']);
 */

import templates from '@/config/notificationTemplates.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'new_post_club'
  | 'videocall_announcement'
  | 'new_message_club'
  | 'reminder_use'
  | 'new_subscriber_pay'
  | 'club_level_up'
  | 'user_level_up'
  | 'other';

export type SupportedLanguage = 'en' | 'es';

type TemplateData = Record<string, unknown>;

interface RenderedTemplate {
  title: string;
  body: string;
  url: string;
  type: string;
  category: string;
  icon: string;
}

interface SendOptions {
  /** Defaults to 'es' */
  language?: SupportedLanguage;
  /** Club icon shown in the notification */
  iconUrl?: string;
  /** Extra data passed inside the notification payload (accessible in the SW) */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a dot-notated key from a nested object.
 * e.g. getNestedValue({ user: { name: 'Ana' } }, 'user.name') → 'Ana'
 */
function getNestedValue(data: TemplateData, key: string): string {
  const value = key.split('.').reduce<unknown>((obj, part) => {
    if (obj !== null && typeof obj === 'object') {
      return (obj as Record<string, unknown>)[part];
    }
    return undefined;
  }, data);

  return value !== undefined && value !== null ? String(value) : `{${key}}`;
}

/**
 * Replaces all occurrences of {variable} and {nested.variable} in a string
 * with the corresponding value from `data`. Leaves the placeholder intact if
 * the key is not found.
 */
function interpolate(template: string, data: TemplateData): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) =>
    getNestedValue(data, key.trim())
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders a notification template by replacing {variables} with data values.
 *
 * @param templateName - One of the 8 NotificationType values
 * @param data         - Key/value pairs (supports nested keys like user.name)
 * @param language     - 'en' | 'es'  (default: 'es')
 * @returns            Rendered template object
 */
export function renderTemplate(
  templateName: NotificationType,
  data: TemplateData,
  language: SupportedLanguage = 'es'
): RenderedTemplate {
  const lang = templates[language] ?? templates['es'];
  const template = lang[templateName as keyof typeof lang];

  if (!template) {
    throw new Error(
      `[NotificationTemplateService] Template "${templateName}" not found for language "${language}". ` +
        `Available templates: ${Object.keys(lang).join(', ')}`
    );
  }

  return {
    title: interpolate(template.title, data),
    body: interpolate(template.body, data),
    url: interpolate(template.url, data),
    type: template.type,
    category: template.category,
    icon: template.icon,
  };
}

/**
 * Renders a template and sends the push notification via OneSignal REST API.
 *
 * Must be called from a server context (Server Action, API Route, Edge Function)
 * because it uses ONESIGNAL_REST_API_KEY.
 *
 * @param templateName - One of the 8 NotificationType values
 * @param data         - Template variables
 * @param userIds      - OneSignal external user IDs (Supabase user UUIDs)
 * @param options      - { language, iconUrl, metadata }
 */
export async function send(
  templateName: NotificationType,
  data: TemplateData,
  userIds: string[],
  options: SendOptions = {}
): Promise<{ success: boolean; onesignalId?: string; error?: string }> {
  const { language = 'es', iconUrl, metadata } = options;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    throw new Error(
      '[NotificationTemplateService] Missing NEXT_PUBLIC_ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY env vars.'
    );
  }

  if (userIds.length === 0) {
    return { success: false, error: 'No user IDs provided.' };
  }

  const rendered = renderTemplate(templateName, data, language);

  const payload = {
    app_id: appId,
    include_external_user_ids: userIds,
    channel_for_external_user_ids: 'push',
    headings: { en: rendered.title, es: rendered.title },
    contents: { en: rendered.body, es: rendered.body },
    url: rendered.url,
    large_icon: iconUrl ?? '/icons/notification-default.png',
    data: {
      type: rendered.type,
      category: rendered.category,
      ...metadata,
    },
  };

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[NotificationTemplateService] OneSignal API error:', errorBody);
    return { success: false, error: errorBody };
  }

  const result = (await response.json()) as { id: string };
  return { success: true, onesignalId: result.id };
}
