<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon from 'next/icon/Icon.vue';
import {
  MAX_CARDS,
  MAX_LIST_ROWS,
  MAX_LIST_SECTIONS,
  MAX_POLL_OPTIONS,
  MAX_QUICK_REPLIES,
} from 'next/message/helpers/interactive';

const props = defineProps({
  accountId: { type: Number, required: true },
  show: { type: Boolean, default: false },
  templateToLoad: { type: Object, default: null },
});

const emit = defineEmits(['send', 'close', 'update:show']);

const { t } = useI18n();

const TEMPLATES_KEY = 'interactiveTemplates';

const templates = ref([]);
const savingTemplate = ref(false);
const templateName = ref('');

const showJsonImport = ref(false);
const jsonText = ref('');
const jsonError = ref('');

function templatesStorageKey() {
  return `${TEMPLATES_KEY}_${props.accountId}`;
}

function loadTemplates() {
  try {
    templates.value = JSON.parse(
      window.localStorage.getItem(templatesStorageKey()) || '[]'
    );
  } catch (error) {
    templates.value = [];
  }
}

function persistTemplates() {
  try {
    window.localStorage.setItem(
      templatesStorageKey(),
      JSON.stringify(templates.value)
    );
  } catch (error) {
    // storage unavailable (quota/private mode): templates stay session-only
  }
}

loadTemplates();

const TYPES = [
  {
    value: 'buttons',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_BUTTONS'),
    icon: 'i-lucide-message-square-more',
  },
  {
    value: 'list',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_LIST'),
    icon: 'i-lucide-list',
  },
  {
    value: 'carousel',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_CAROUSEL'),
    icon: 'i-lucide-gallery-horizontal',
  },
  {
    value: 'poll',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_POLL'),
    icon: 'i-lucide-bar-chart-3',
  },
  {
    value: 'image',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_IMAGE'),
    icon: 'i-lucide-image',
  },
  {
    value: 'video',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_VIDEO'),
    icon: 'i-lucide-video',
  },
  {
    value: 'audio',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_AUDIO'),
    icon: 'i-lucide-audio-lines',
  },
  {
    value: 'document',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_DOCUMENT'),
    icon: 'i-lucide-file-text',
  },
  {
    value: 'sticker',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_STICKER'),
    icon: 'i-lucide-sticker',
  },
  {
    value: 'location',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_LOCATION'),
    icon: 'i-lucide-map-pin',
  },
  {
    value: 'contact',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_CONTACT'),
    icon: 'i-lucide-contact',
  },
  {
    value: 'reaction',
    label: t('CONVERSATION.REPLYBOX.INTERACTIVE.TAB_REACTION'),
    icon: 'i-lucide-smile-plus',
  },
];

const BUTTON_KINDS = [
  { value: 'reply', label: t('CONVERSATION.REPLYBOX.INTERACTIVE.KIND_REPLY') },
  { value: 'url', label: t('CONVERSATION.REPLYBOX.INTERACTIVE.KIND_URL') },
  { value: 'copy', label: t('CONVERSATION.REPLYBOX.INTERACTIVE.KIND_COPY') },
  { value: 'call', label: t('CONVERSATION.REPLYBOX.INTERACTIVE.KIND_CALL') },
];

const showModel = computed({
  get() {
    return props.show;
  },
  set(value) {
    emit('update:show', value);
  },
});

function emptyButton() {
  return { kind: 'reply', title: '', url: '', copyText: '', phoneNumber: '' };
}

function emptyCard() {
  return {
    mediaUrl: '',
    title: '',
    body: '',
    footer: '',
    buttons: [emptyButton()],
  };
}

function emptySection() {
  return { title: '', rows: [{ title: '', description: '' }] };
}

const state = reactive({
  type: 'buttons',
  body: '',
  footer: '',
  button: t('CONVERSATION.REPLYBOX.INTERACTIVE.MENU_FALLBACK'),
  buttons: [emptyButton()],
  sections: [emptySection()],
  cards: [emptyCard()],
  pollName: '',
  pollOptions: [{ name: '' }],
  pollSelectableCount: 1,
  mediaUrl: '',
  fileName: '',
  mimeType: '',
  viewOnce: false,
  gifPlayback: false,
  ptt: false,
  locationLat: '',
  locationLng: '',
  locationName: '',
  locationAddress: '',
  contactName: '',
  contactVcard: '',
  reactionEmoji: '',
  reactionMessageId: '',
});

// Normalizes payloads coming from older saved templates or pasted JSON
// (motor REST format) into the composer state shape.
function normalizeCardButton(button) {
  if (!button || typeof button !== 'object') return null;
  const title = button.title || button.text || '';
  if (!title) return null;
  const kind = ['url', 'copy', 'call'].includes(button.kind || button.type)
    ? button.kind || button.type
    : 'reply';
  return {
    kind,
    title,
    url: button.url || '',
    copyText: button.copyText || '',
    phoneNumber: button.phoneNumber || '',
  };
}

function normalizeCard(card) {
  if (!card || typeof card !== 'object') return null;
  const buttons = Array.isArray(card.buttons)
    ? card.buttons.map(normalizeCardButton).filter(Boolean)
    : [];
  if (card.button && typeof card.button === 'string' && card.button.trim()) {
    buttons.unshift({
      kind: 'reply',
      title: card.button.trim(),
      url: '',
      copyText: '',
      phoneNumber: '',
    });
  }
  return {
    mediaUrl: card.mediaUrl || card.imageUrl || '',
    title: card.title || '',
    body: card.body || '',
    footer: card.footer || '',
    buttons: buttons.length ? buttons : [emptyButton()],
  };
}

function normalizeSection(section) {
  if (!section || typeof section !== 'object') return null;
  const rows = Array.isArray(section.rows)
    ? section.rows
        .map(row => {
          if (!row || typeof row !== 'object') return null;
          const title = row.title || row.text || '';
          if (!title) return null;
          return { title, description: row.description || '' };
        })
        .filter(Boolean)
    : [];
  return {
    title: section.title || '',
    rows: rows.length ? rows : [{ title: '', description: '' }],
  };
}

function applyPayloadToState(payload) {
  const known = [
    'buttons',
    'list',
    'carousel',
    'poll',
    'image',
    'video',
    'audio',
    'document',
    'sticker',
    'location',
    'contact',
    'reaction',
  ];
  state.type = known.includes(payload.type) ? payload.type : 'buttons';
  state.body = payload.body || payload.text || payload.caption || '';
  state.footer = payload.footer || '';
  state.buttons =
    Array.isArray(payload.buttons) && payload.buttons.length
      ? payload.buttons.map(normalizeCardButton).filter(Boolean)
      : [emptyButton()];
  if (!state.buttons.length) state.buttons = [emptyButton()];
  state.button =
    payload.button || t('CONVERSATION.REPLYBOX.INTERACTIVE.MENU_FALLBACK');
  state.sections =
    Array.isArray(payload.sections) && payload.sections.length
      ? payload.sections.map(normalizeSection).filter(Boolean)
      : [emptySection()];
  if (!state.sections.length) state.sections = [emptySection()];
  state.cards =
    Array.isArray(payload.cards) && payload.cards.length
      ? payload.cards.map(normalizeCard).filter(Boolean)
      : [emptyCard()];
  if (!state.cards.length) state.cards = [emptyCard()];
  state.pollName = payload.name || '';
  state.pollOptions =
    Array.isArray(payload.options) && payload.options.length
      ? payload.options
          .map(option =>
            typeof option === 'string'
              ? { name: option }
              : { name: option?.name || '' }
          )
          .filter(option => option.name)
      : [{ name: '' }];
  if (!state.pollOptions.length) state.pollOptions = [{ name: '' }];
  state.pollSelectableCount = payload.selectableCount || 1;
  state.mediaUrl = payload.url || '';
  state.fileName = payload.fileName || '';
  state.mimeType = payload.mimeType || '';
  state.viewOnce = !!payload.viewOnce;
  state.gifPlayback = !!payload.gifPlayback;
  state.ptt = !!payload.ptt;
  state.locationLat =
    payload.latitude !== undefined ? String(payload.latitude) : '';
  state.locationLng =
    payload.longitude !== undefined ? String(payload.longitude) : '';
  state.locationName = payload.locationName || '';
  state.locationAddress = payload.address || '';
  state.contactName = payload.displayName || '';
  state.contactVcard = payload.vcard || '';
  state.reactionEmoji = payload.reaction || '';
  state.reactionMessageId = payload.messageId || '';
}

function loadTemplate(template) {
  try {
    applyPayloadToState(JSON.parse(JSON.stringify(template.payload)));
  } catch (error) {
    // ignore malformed template payloads
  }
}

function saveTemplate() {
  if (!templateName.value.trim()) return;
  templates.value.unshift({
    id: Date.now().toString(36),
    name: templateName.value.trim(),
    payload: JSON.parse(JSON.stringify(state)),
  });
  persistTemplates();
  templateName.value = '';
  savingTemplate.value = false;
}

function deleteTemplate(id) {
  templates.value = templates.value.filter(template => template.id !== id);
  persistTemplates();
}

// Accepts both the platform contract ({type: 'carousel'|...}) and the motor
// REST payload ({instanceId, to, text, footer, cards|buttons|sections|...}).
function extractInteractivePayload(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('invalid');
  }
  if (raw.interactive && typeof raw.interactive === 'object') {
    return raw.interactive;
  }
  if (raw.type) return raw;

  const payload = { body: raw.text || raw.body || '' };
  if (raw.footer) payload.footer = raw.footer;
  if (Array.isArray(raw.cards)) {
    payload.type = 'carousel';
    payload.cards = raw.cards;
  } else if (Array.isArray(raw.sections)) {
    payload.type = 'list';
    payload.button = raw.button || raw.buttonText || '';
    payload.header = raw.title || '';
    payload.sections = raw.sections;
  } else if (Array.isArray(raw.buttons)) {
    payload.type = 'buttons';
    payload.buttons = raw.buttons;
  } else if (Array.isArray(raw.options)) {
    payload.type = 'poll';
    payload.name = raw.name || raw.question || payload.body;
    payload.options = raw.options;
    payload.selectableCount = raw.selectableCount || 1;
  } else if (raw.reaction) {
    payload.type = 'reaction';
    payload.reaction = raw.reaction;
    payload.messageId = raw.messageId || '';
  } else if (raw.vcard) {
    payload.type = 'contact';
    payload.displayName = raw.displayName || '';
    payload.vcard = raw.vcard;
  } else if (raw.latitude !== undefined && raw.longitude !== undefined) {
    payload.type = 'location';
    payload.latitude = raw.latitude;
    payload.longitude = raw.longitude;
    payload.locationName = raw.name || '';
    payload.address = raw.address || '';
  } else if (raw.fileName) {
    payload.type = 'document';
    payload.url = raw.url || '';
    payload.fileName = raw.fileName;
    payload.mimeType = raw.mimeType || '';
  } else if (
    raw.url &&
    (raw.ptt !== undefined || raw.mimeType?.startsWith('audio'))
  ) {
    payload.type = 'audio';
    payload.url = raw.url;
    payload.ptt = !!raw.ptt;
    payload.viewOnce = !!raw.viewOnce;
    payload.mimeType = raw.mimeType || '';
  } else if (
    raw.url &&
    (raw.mimeType?.startsWith('video') || raw.gifPlayback !== undefined)
  ) {
    payload.type = 'video';
    payload.url = raw.url;
    payload.viewOnce = !!raw.viewOnce;
    payload.gifPlayback = !!raw.gifPlayback;
    payload.mimeType = raw.mimeType || '';
  } else if (raw.url) {
    payload.type = raw.mimeType === 'image/webp' ? 'sticker' : 'image';
    payload.url = raw.url;
    payload.viewOnce = !!raw.viewOnce;
  } else {
    throw new Error('invalid');
  }
  return payload;
}

function importJson() {
  jsonError.value = '';
  try {
    const payload = extractInteractivePayload(JSON.parse(jsonText.value));
    applyPayloadToState(payload);
    showJsonImport.value = false;
    jsonText.value = '';
  } catch (error) {
    jsonError.value = t('CONVERSATION.REPLYBOX.INTERACTIVE.JSON_INVALID');
  }
}

watch(
  () => props.templateToLoad,
  template => {
    if (template?.payload) loadTemplate(template);
  }
);

const currentTypeLabel = computed(
  () => TYPES.find(type => type.value === state.type)?.label
);

function hasValidButtonTarget(button) {
  if (button.kind === 'url') return !!button.url.trim();
  if (button.kind === 'copy') return !!button.copyText.trim();
  if (button.kind === 'call') return !!button.phoneNumber.trim();
  return true;
}

function validButtons(list) {
  const filled = list.filter(button => button.title.trim());
  if (!filled.length) return false;
  return filled.every(hasValidButtonTarget);
}

const isMediaType = computed(() =>
  ['image', 'video', 'audio', 'document', 'sticker'].includes(state.type)
);

// Local file upload: the file goes out as a native Chatwoot attachment
// (permanent storage, native rendering); URL keeps using the contract.
const MEDIA_ACCEPT = {
  image: 'image/*',
  video: 'video/*',
  audio: 'audio/*',
  sticker: 'image/webp',
  document: undefined,
};
const mediaFile = ref(null);

function onMediaFileChange(event) {
  mediaFile.value = event.target.files[0] || null;
}

function clearMediaFile() {
  mediaFile.value = null;
}

const mediaAccept = computed(() => MEDIA_ACCEPT[state.type]);

const isValid = computed(() => {
  if (state.type === 'poll') {
    return (
      state.pollName.trim() &&
      state.pollOptions.map(option => option.name.trim()).filter(Boolean)
        .length >= 2
    );
  }
  if (state.type === 'reaction') {
    return !!state.reactionEmoji.trim();
  }
  if (state.type === 'contact') {
    return !!state.contactName.trim() && !!state.contactVcard.trim();
  }
  if (state.type === 'location') {
    return (
      state.locationLat.trim() !== '' &&
      state.locationLng.trim() !== '' &&
      !Number.isNaN(Number(state.locationLat)) &&
      !Number.isNaN(Number(state.locationLng))
    );
  }
  if (isMediaType.value) {
    if (!state.mediaUrl.trim() && !mediaFile.value) return false;
    if (state.type === 'document' && !state.fileName.trim()) return false;
    return true;
  }
  if (!state.body.trim()) return false;
  if (state.type === 'buttons') {
    return validButtons(state.buttons);
  }
  if (state.type === 'list') {
    return (
      state.button.trim() &&
      state.sections.some(section => section.rows.some(row => row.title.trim()))
    );
  }
  if (state.type === 'carousel') {
    return (
      state.cards.length >= 2 &&
      state.cards.every(card => card.body.trim() && validButtons(card.buttons))
    );
  }
  return false;
});

function switchType(type) {
  state.type = type;
}

function addChip(list, max, factory) {
  if (list.length < max) list.push(factory());
}

function removeChip(list, index) {
  if (list.length > 1) list.splice(index, 1);
}

function addSection() {
  if (state.sections.length < MAX_LIST_SECTIONS) {
    state.sections.push(emptySection());
  }
}

function addCard() {
  if (state.cards.length < MAX_CARDS) {
    state.cards.push(emptyCard());
  }
}

function addPollOption() {
  if (state.pollOptions.length < MAX_POLL_OPTIONS) {
    state.pollOptions.push({ name: '' });
  }
}

function buildPayload() {
  if (state.type === 'poll') {
    return {
      type: 'poll',
      name: state.pollName.trim(),
      options: state.pollOptions
        .map(option => option.name.trim())
        .filter(Boolean),
      selectableCount: state.pollSelectableCount,
    };
  }
  if (state.type === 'reaction') {
    return {
      type: 'reaction',
      reaction: state.reactionEmoji.trim(),
      messageId: state.reactionMessageId.trim() || undefined,
    };
  }
  if (state.type === 'contact') {
    return {
      type: 'contact',
      displayName: state.contactName.trim(),
      vcard: state.contactVcard.trim(),
    };
  }
  if (state.type === 'location') {
    return {
      type: 'location',
      latitude: Number(state.locationLat),
      longitude: Number(state.locationLng),
      name: state.locationName.trim() || undefined,
      address: state.locationAddress.trim() || undefined,
    };
  }
  if (isMediaType.value) {
    const payload = { type: state.type, url: state.mediaUrl.trim() };
    if (state.type !== 'sticker' && state.body.trim()) {
      payload.caption = state.body.trim();
    }
    if (['image', 'video', 'audio'].includes(state.type) && state.viewOnce) {
      payload.viewOnce = true;
    }
    if (state.type === 'video' && state.gifPlayback) payload.gifPlayback = true;
    if (
      ['video', 'audio', 'document'].includes(state.type) &&
      state.mimeType.trim()
    ) {
      payload.mimeType = state.mimeType.trim();
    }
    if (state.type === 'audio' && state.ptt) payload.ptt = true;
    if (state.type === 'document' && state.fileName.trim()) {
      payload.fileName = state.fileName.trim();
    }
    return payload;
  }
  const payload = { type: state.type, body: state.body.trim() };
  if (state.footer.trim()) payload.footer = state.footer.trim();

  if (state.type === 'buttons') {
    payload.buttons = state.buttons
      .map((button, index) => {
        const base = {
          type: button.kind || 'reply',
          id: `btn_${index + 1}`,
          title: button.title.trim(),
        };
        if (button.kind === 'url') base.url = button.url.trim();
        if (button.kind === 'copy') base.copyText = button.copyText.trim();
        if (button.kind === 'call')
          base.phoneNumber = button.phoneNumber.trim();
        return base;
      })
      .filter(button => button.title);
  }

  if (state.type === 'list') {
    payload.button =
      state.button.trim() ||
      t('CONVERSATION.REPLYBOX.INTERACTIVE.MENU_FALLBACK');
    payload.sections = state.sections
      .map((section, sectionIndex) => ({
        title: section.title.trim(),
        rows: section.rows
          .map((row, rowIndex) => ({
            id: `secao_${sectionIndex + 1}_item_${rowIndex + 1}`,
            title: row.title.trim(),
            description: row.description.trim() || undefined,
          }))
          .filter(row => row.title),
      }))
      .filter(section => section.rows.length);
  }

  if (state.type === 'carousel') {
    payload.cards = state.cards
      .map((card, index) => ({
        mediaUrl: card.mediaUrl.trim() || undefined,
        title: card.title.trim() || undefined,
        body: card.body.trim(),
        footer: card.footer.trim() || undefined,
        buttons: card.buttons
          .map((button, buttonIndex) => {
            const base = {
              type: button.kind || 'reply',
              id: `card_${index + 1}_b${buttonIndex + 1}`,
              title: button.title.trim(),
            };
            if (button.kind === 'url') base.url = button.url.trim();
            if (button.kind === 'copy') base.copyText = button.copyText.trim();
            if (button.kind === 'call')
              base.phoneNumber = button.phoneNumber.trim();
            return base;
          })
          .filter(button => button.title),
      }))
      .filter(card => card.body && card.buttons.length);
  }

  return payload;
}

function send() {
  if (!isValid.value) return;
  const payload = buildPayload();
  let content = payload.body;
  if (state.type === 'poll') content = state.pollName.trim();
  if (state.type === 'reaction') content = state.reactionEmoji.trim();
  if (state.type === 'contact') content = state.contactName.trim();
  if (state.type === 'location') {
    content = state.locationName.trim() || state.locationAddress.trim();
  }
  if (state.type === 'document') content = state.fileName.trim();
  // A local file goes out as a native attachment (permanent rendering);
  // the URL-based payload keeps using the interactive contract.
  if (isMediaType.value && mediaFile.value) {
    emit('send', { content, contentAttributes: {}, file: mediaFile.value });
    return;
  }
  emit('send', {
    content,
    contentAttributes: { interactive: payload },
  });
}
</script>

<template>
  <woot-modal
    v-model:show="showModel"
    :on-close="() => emit('close')"
    size="modal-big"
  >
    <woot-modal-header
      :header-title="
        $t('CONVERSATION.REPLYBOX.INTERACTIVE.TITLE', {
          type: currentTypeLabel,
        })
      "
      :header-content="$t('CONVERSATION.REPLYBOX.INTERACTIVE.MODAL_SUBTITLE')"
    />
    <div
      class="flex flex-col gap-2 max-h-[70vh] px-8 pb-6 overflow-y-auto"
      data-testid="interactive-composer"
    >
      <!-- biblioteca de modelos + import de JSON -->
      <div class="rounded-lg border border-dashed border-n-weak p-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg border border-n-weak px-2 py-1 text-xs font-medium text-n-slate-11 hover:bg-n-alpha-1"
            data-testid="save-template"
            @click="savingTemplate = !savingTemplate"
          >
            <Icon icon="i-lucide-save" class="size-3.5" />
            {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.SAVE_TEMPLATE') }}
          </button>
          <template v-if="savingTemplate">
            <input
              v-model="templateName"
              :placeholder="
                $t(
                  'CONVERSATION.REPLYBOX.INTERACTIVE.TEMPLATE_NAME_PLACEHOLDER'
                )
              "
              class="w-40 rounded-lg border border-n-weak bg-n-solid-1 px-2 py-1 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
              @keyup.enter="saveTemplate"
            />
            <button
              type="button"
              class="rounded-lg bg-n-teal-11 px-2 py-1 text-xs font-medium text-white"
              @click="saveTemplate"
            >
              {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.SAVE') }}
            </button>
          </template>
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg border border-n-weak px-2 py-1 text-xs font-medium text-n-slate-11 hover:bg-n-alpha-1"
            data-testid="import-json"
            @click="showJsonImport = !showJsonImport"
          >
            <Icon icon="i-lucide-braces" class="size-3.5" />
            {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.JSON_IMPORT') }}
          </button>
          <div
            v-for="template in templates"
            :key="template.id"
            class="flex items-center gap-0.5 rounded-lg bg-n-alpha-2 px-2 py-1 text-xs font-medium text-n-slate-12"
          >
            <button
              type="button"
              class="flex items-center gap-1"
              :title="$t('CONVERSATION.REPLYBOX.INTERACTIVE.LOAD_TEMPLATE')"
              @click="loadTemplate(template)"
            >
              <Icon icon="i-lucide-bookmark" class="size-3.5 text-n-teal-11" />
              {{ template.name }}
            </button>
            <button
              type="button"
              class="text-n-slate-10 hover:text-n-red-11"
              :aria-label="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.DELETE_TEMPLATE')
              "
              @click="deleteTemplate(template.id)"
            >
              <Icon icon="i-lucide-x" class="size-3" />
            </button>
          </div>
        </div>
        <div v-if="showJsonImport" class="mt-2 flex flex-col gap-1.5">
          <textarea
            v-model="jsonText"
            rows="6"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.JSON_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 font-mono text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg bg-n-teal-11 px-2.5 py-1 text-xs font-medium text-white"
              @click="importJson"
            >
              {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.JSON_IMPORT_ACTION') }}
            </button>
            <span v-if="jsonError" class="text-xs text-n-red-11">
              {{ jsonError }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="type in TYPES"
          :key="type.value"
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
          :class="
            state.type === type.value
              ? 'bg-n-teal-11/10 text-n-teal-11 border border-n-teal-11/30'
              : 'text-n-slate-11 border border-n-weak hover:bg-n-alpha-1'
          "
          @click="switchType(type.value)"
        >
          <Icon :icon="type.icon" class="size-3.5" />
          {{ type.label }}
        </button>
      </div>

      <div class="flex flex-col gap-2">
        <textarea
          v-if="
            !['poll', 'sticker', 'location', 'contact', 'reaction'].includes(
              state.type
            )
          "
          v-model="state.body"
          rows="2"
          maxlength="1024"
          :placeholder="
            $t('CONVERSATION.REPLYBOX.INTERACTIVE.BODY_PLACEHOLDER')
          "
          class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
        />
        <input
          v-if="['buttons', 'list', 'carousel'].includes(state.type)"
          v-model="state.footer"
          maxlength="60"
          :placeholder="
            $t('CONVERSATION.REPLYBOX.INTERACTIVE.FOOTER_PLACEHOLDER')
          "
          class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
        />

        <!-- media (image / video / audio / document / sticker) -->
        <template v-if="isMediaType">
          <input
            v-model="state.mediaUrl"
            maxlength="512"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.MEDIA_URL_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <div class="flex items-center gap-2">
            <label
              class="flex items-center gap-1.5 text-xs font-medium text-n-teal-11 hover:underline cursor-pointer"
            >
              <Icon icon="i-lucide-upload" class="size-3.5" />
              {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.UPLOAD_FILE') }}
              <input
                type="file"
                :accept="mediaAccept"
                class="hidden"
                @change="onMediaFileChange"
              />
            </label>
            <span
              v-if="mediaFile"
              class="flex items-center gap-1 text-xs text-n-slate-11"
            >
              {{ mediaFile.name }}
              <button
                type="button"
                class="text-n-slate-10 hover:text-n-red-11"
                :aria-label="$t('CONVERSATION.REPLYBOX.INTERACTIVE.CLEAR_FILE')"
                @click="clearMediaFile"
              >
                <Icon icon="i-lucide-x" class="size-3" />
              </button>
            </span>
          </div>
          <input
            v-if="state.type === 'document'"
            v-model="state.fileName"
            maxlength="255"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.FILE_NAME_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <input
            v-if="['video', 'audio', 'document'].includes(state.type)"
            v-model="state.mimeType"
            maxlength="100"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.MIME_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <label
            v-if="['image', 'video', 'audio'].includes(state.type)"
            class="flex items-center gap-1.5 text-xs text-n-slate-11"
          >
            <input v-model="state.viewOnce" type="checkbox" />
            {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.VIEW_ONCE') }}
          </label>
          <label
            v-if="state.type === 'video'"
            class="flex items-center gap-1.5 text-xs text-n-slate-11"
          >
            <input v-model="state.gifPlayback" type="checkbox" />
            {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.GIF_PLAYBACK') }}
          </label>
          <label
            v-if="state.type === 'audio'"
            class="flex items-center gap-1.5 text-xs text-n-slate-11"
          >
            <input v-model="state.ptt" type="checkbox" />
            {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.PTT') }}
          </label>
        </template>

        <!-- location -->
        <template v-if="state.type === 'location'">
          <div class="flex gap-2">
            <input
              v-model="state.locationLat"
              maxlength="20"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.LAT_PLACEHOLDER')
              "
              class="w-1/2 rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <input
              v-model="state.locationLng"
              maxlength="20"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.LNG_PLACEHOLDER')
              "
              class="w-1/2 rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
          </div>
          <input
            v-model="state.locationName"
            maxlength="255"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.LOCATION_NAME_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <input
            v-model="state.locationAddress"
            maxlength="255"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADDRESS_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
        </template>

        <!-- contact -->
        <template v-if="state.type === 'contact'">
          <input
            v-model="state.contactName"
            maxlength="255"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.DISPLAY_NAME_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <textarea
            v-model="state.contactVcard"
            rows="4"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.VCARD_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 font-mono text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
        </template>

        <!-- reaction -->
        <template v-if="state.type === 'reaction'">
          <div class="flex gap-2">
            <input
              v-model="state.reactionEmoji"
              maxlength="8"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.REACTION_PLACEHOLDER')
              "
              class="w-24 rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-center text-lg text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <input
              v-model="state.reactionMessageId"
              maxlength="128"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.MESSAGE_ID_PLACEHOLDER')
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
          </div>
        </template>

        <!-- buttons -->
        <template v-if="state.type === 'buttons'">
          <div
            v-for="(button, index) in state.buttons"
            :key="index"
            class="flex flex-col gap-1.5 rounded-lg border border-n-weak p-2.5"
          >
            <div class="flex items-center gap-2">
              <select
                v-model="button.kind"
                class="rounded-lg border border-n-weak bg-n-solid-1 px-2 py-2 text-xs text-n-slate-12 outline-none"
              >
                <option
                  v-for="kind in BUTTON_KINDS"
                  :key="kind.value"
                  :value="kind.value"
                >
                  {{ kind.label }}
                </option>
              </select>
              <input
                v-model="button.title"
                maxlength="20"
                :placeholder="
                  $t('CONVERSATION.REPLYBOX.INTERACTIVE.BUTTON_PLACEHOLDER', {
                    n: index + 1,
                  })
                "
                class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
              />
              <button
                v-if="state.buttons.length > 1"
                type="button"
                class="rounded-lg p-2 text-n-slate-11 hover:bg-n-alpha-1"
                @click="removeChip(state.buttons, index)"
              >
                <Icon icon="i-lucide-trash-2" class="size-4" />
              </button>
            </div>
            <input
              v-if="button.kind === 'url'"
              v-model="button.url"
              maxlength="512"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.URL_PLACEHOLDER')
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <input
              v-if="button.kind === 'copy'"
              v-model="button.copyText"
              maxlength="256"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.COPY_PLACEHOLDER')
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <input
              v-if="button.kind === 'call'"
              v-model="button.phoneNumber"
              maxlength="20"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.PHONE_PLACEHOLDER')
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
          </div>
          <button
            v-if="state.buttons.length < MAX_QUICK_REPLIES"
            type="button"
            class="self-start text-xs font-medium text-n-teal-11 hover:underline"
            @click="addChip(state.buttons, MAX_QUICK_REPLIES, emptyButton)"
          >
            {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_BUTTON') }}
          </button>
        </template>

        <!-- poll -->
        <template v-if="state.type === 'poll'">
          <input
            v-model="state.pollName"
            maxlength="255"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.POLL_NAME_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <div
            v-for="(option, index) in state.pollOptions"
            :key="index"
            class="flex items-center gap-2"
          >
            <input
              v-model="option.name"
              maxlength="255"
              :placeholder="
                $t(
                  'CONVERSATION.REPLYBOX.INTERACTIVE.POLL_OPTION_PLACEHOLDER',
                  { n: index + 1 }
                )
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <button
              v-if="state.pollOptions.length > 2"
              type="button"
              class="rounded-lg p-2 text-n-slate-11 hover:bg-n-alpha-1"
              @click="state.pollOptions.splice(index, 1)"
            >
              <Icon icon="i-lucide-trash-2" class="size-4" />
            </button>
          </div>
          <div class="flex items-center justify-between">
            <button
              v-if="state.pollOptions.length < MAX_POLL_OPTIONS"
              type="button"
              class="text-xs font-medium text-n-teal-11 hover:underline"
              @click="addPollOption"
            >
              {{
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_ROW', {
                  n: MAX_POLL_OPTIONS,
                })
              }}
            </button>
            <label class="flex items-center gap-1.5 text-xs text-n-slate-11">
              <input
                v-model.number="state.pollSelectableCount"
                type="radio"
                value="1"
              />
              {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.POLL_SINGLE') }}
              <input
                v-model.number="state.pollSelectableCount"
                type="radio"
                :value="2"
                class="ml-2"
              />
              {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.POLL_MULTI') }}
            </label>
          </div>
        </template>

        <!-- list (multi-section) -->
        <template v-if="state.type === 'list'">
          <input
            v-model="state.button"
            maxlength="20"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.MENU_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <div
            v-for="(section, sectionIndex) in state.sections"
            :key="sectionIndex"
            class="flex flex-col gap-2 rounded-lg border border-n-weak p-2.5"
          >
            <div class="flex items-center gap-2">
              <input
                v-model="section.title"
                maxlength="24"
                :placeholder="
                  $t(
                    'CONVERSATION.REPLYBOX.INTERACTIVE.SECTION_PLACEHOLDER_N',
                    { n: sectionIndex + 1 }
                  )
                "
                class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs font-medium text-n-slate-12 outline-none focus:border-n-teal-11/40"
              />
              <button
                v-if="state.sections.length > 1"
                type="button"
                class="rounded-lg p-1.5 text-n-slate-11 hover:bg-n-alpha-1"
                @click="state.sections.splice(sectionIndex, 1)"
              >
                <Icon icon="i-lucide-trash-2" class="size-3.5" />
              </button>
            </div>
            <div
              v-for="(row, rowIndex) in section.rows"
              :key="rowIndex"
              class="flex items-center gap-2"
            >
              <input
                v-model="row.title"
                maxlength="24"
                :placeholder="
                  $t('CONVERSATION.REPLYBOX.INTERACTIVE.ROW_PLACEHOLDER', {
                    n: rowIndex + 1,
                  })
                "
                class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
              />
              <input
                v-model="row.description"
                maxlength="72"
                :placeholder="
                  $t(
                    'CONVERSATION.REPLYBOX.INTERACTIVE.ROW_DESCRIPTION_PLACEHOLDER'
                  )
                "
                class="w-2/5 rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
              />
              <button
                v-if="section.rows.length > 1"
                type="button"
                class="rounded-lg p-1.5 text-n-slate-11 hover:bg-n-alpha-1"
                @click="section.rows.splice(rowIndex, 1)"
              >
                <Icon icon="i-lucide-trash-2" class="size-3.5" />
              </button>
            </div>
            <button
              v-if="section.rows.length < MAX_LIST_ROWS"
              type="button"
              class="self-start text-xs font-medium text-n-teal-11 hover:underline"
              @click="section.rows.push({ title: '', description: '' })"
            >
              {{
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_ROW', {
                  n: MAX_LIST_ROWS,
                })
              }}
            </button>
          </div>
          <button
            v-if="state.sections.length < MAX_LIST_SECTIONS"
            type="button"
            class="self-start text-xs font-medium text-n-teal-11 hover:underline"
            @click="addSection"
          >
            {{
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_SECTION', {
                n: MAX_LIST_SECTIONS,
              })
            }}
          </button>
        </template>

        <!-- carousel -->
        <template v-if="state.type === 'carousel'">
          <div
            v-for="(card, index) in state.cards"
            :key="index"
            class="flex flex-col gap-2 rounded-lg border border-n-weak p-2.5"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-n-slate-11">{{
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_LABEL', {
                  n: index + 1,
                })
              }}</span>
              <button
                v-if="state.cards.length > 1"
                type="button"
                class="rounded-lg p-1 text-n-slate-11 hover:bg-n-alpha-1"
                @click="state.cards.splice(index, 1)"
              >
                <Icon icon="i-lucide-trash-2" class="size-3.5" />
              </button>
            </div>
            <input
              v-model="card.mediaUrl"
              maxlength="512"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_MEDIA_PLACEHOLDER')
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <input
              v-model="card.title"
              maxlength="60"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_TITLE_PLACEHOLDER')
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <textarea
              v-model="card.body"
              rows="1"
              maxlength="1024"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_BODY_PLACEHOLDER', {
                  n: index + 1,
                })
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <input
              v-model="card.footer"
              maxlength="60"
              :placeholder="
                $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_FOOTER_PLACEHOLDER')
              "
              class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
            />
            <div
              v-for="(button, buttonIndex) in card.buttons"
              :key="buttonIndex"
              class="flex flex-col gap-1.5 rounded-lg border border-n-weak p-2"
            >
              <div class="flex items-center gap-2">
                <select
                  v-model="button.kind"
                  class="rounded-lg border border-n-weak bg-n-solid-1 px-2 py-1.5 text-xs text-n-slate-12 outline-none"
                >
                  <option
                    v-for="kind in BUTTON_KINDS"
                    :key="kind.value"
                    :value="kind.value"
                  >
                    {{ kind.label }}
                  </option>
                </select>
                <input
                  v-model="button.title"
                  maxlength="20"
                  :placeholder="
                    $t(
                      'CONVERSATION.REPLYBOX.INTERACTIVE.CARD_BUTTON_PLACEHOLDER'
                    )
                  "
                  class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-1.5 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
                />
                <button
                  v-if="card.buttons.length > 1"
                  type="button"
                  class="rounded-lg p-1.5 text-n-slate-11 hover:bg-n-alpha-1"
                  @click="card.buttons.splice(buttonIndex, 1)"
                >
                  <Icon icon="i-lucide-trash-2" class="size-3.5" />
                </button>
              </div>
              <input
                v-if="button.kind === 'url'"
                v-model="button.url"
                maxlength="512"
                :placeholder="
                  $t('CONVERSATION.REPLYBOX.INTERACTIVE.URL_PLACEHOLDER')
                "
                class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-1.5 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
              />
              <input
                v-if="button.kind === 'copy'"
                v-model="button.copyText"
                maxlength="256"
                :placeholder="
                  $t('CONVERSATION.REPLYBOX.INTERACTIVE.COPY_PLACEHOLDER')
                "
                class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-1.5 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
              />
              <input
                v-if="button.kind === 'call'"
                v-model="button.phoneNumber"
                maxlength="20"
                :placeholder="
                  $t('CONVERSATION.REPLYBOX.INTERACTIVE.PHONE_PLACEHOLDER')
                "
                class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-1.5 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
              />
            </div>
            <button
              v-if="card.buttons.length < 3"
              type="button"
              class="self-start text-xs font-medium text-n-teal-11 hover:underline"
              @click="card.buttons.push(emptyButton())"
            >
              {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_ADD_BUTTON') }}
            </button>
          </div>
          <button
            v-if="state.cards.length < MAX_CARDS"
            type="button"
            class="self-start text-xs font-medium text-n-teal-11 hover:underline"
            @click="addCard"
          >
            {{
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_CARD', { n: MAX_CARDS })
            }}
          </button>
        </template>
      </div>

      <div class="flex justify-end pt-2">
        <button
          type="button"
          :disabled="!isValid"
          class="rounded-lg bg-n-teal-11 px-3.5 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          @click="send"
        >
          {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.SEND') }}
        </button>
      </div>
    </div>
  </woot-modal>
</template>
