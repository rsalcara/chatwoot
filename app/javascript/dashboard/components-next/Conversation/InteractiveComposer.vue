<script setup>
import { computed, reactive, ref } from 'vue';
import Icon from 'next/icon/Icon.vue';
import {
  MAX_CARDS,
  MAX_LIST_ROWS,
  MAX_QUICK_REPLIES,
} from 'next/message/helpers/interactive';

const props = defineProps({
  accountId: { type: Number, required: true },
});

const emit = defineEmits(['send', 'close']);

const TEMPLATES_KEY = 'interactiveTemplates';

const templates = ref([]);
const savingTemplate = ref(false);
const templateName = ref('');

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
  window.localStorage.setItem(
    templatesStorageKey(),
    JSON.stringify(templates.value)
  );
}

loadTemplates();

const TYPES = [
  { value: 'buttons', label: 'Botões', icon: 'i-lucide-message-square-more' },
  { value: 'list', label: 'Lista', icon: 'i-lucide-list' },
  {
    value: 'carousel',
    label: 'Carrossel',
    icon: 'i-lucide-gallery-horizontal',
  },
  { value: 'poll', label: 'Enquete', icon: 'i-lucide-bar-chart-3' },
];

const BUTTON_KINDS = [
  { value: 'reply', label: 'Resposta' },
  { value: 'url', label: 'URL' },
  { value: 'copy', label: 'Copiar' },
  { value: 'call', label: 'Ligar' },
];

const state = reactive({
  type: 'buttons',
  body: '',
  footer: '',
  button: 'Ver opções',
  buttons: [
    { kind: 'reply', title: '', url: '', copyText: '', phoneNumber: '' },
  ],
  sectionTitle: '',
  rows: [{ title: '', description: '' }],
  cards: [{ mediaUrl: '', body: '', button: '' }],
  pollName: '',
  pollOptions: [{ name: '' }],
  pollSelectableCount: 1,
});

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

function loadTemplate(template) {
  Object.assign(state, JSON.parse(JSON.stringify(template.payload)));
}

function deleteTemplate(id) {
  templates.value = templates.value.filter(template => template.id !== id);
  persistTemplates();
}

loadTemplates();

const currentTypeLabel = computed(
  () => TYPES.find(type => type.value === state.type)?.label
);

const isValid = computed(() => {
  if (state.type === 'poll') {
    return (
      state.pollName.trim() &&
      state.pollOptions.map(option => option.name.trim()).filter(Boolean)
        .length >= 2
    );
  }
  if (!state.body.trim()) return false;
  if (state.type === 'buttons') {
    return state.buttons.some(button => button.title.trim());
  }
  if (state.type === 'list') {
    return state.button.trim() && state.rows.some(row => row.title.trim());
  }
  if (state.type === 'carousel') {
    return state.cards.some(card => card.body.trim() || card.mediaUrl.trim());
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

function addRow() {
  if (state.rows.length < MAX_LIST_ROWS) {
    state.rows.push({ title: '', description: '' });
  }
}

function addCard() {
  if (state.cards.length < MAX_CARDS) {
    state.cards.push({ mediaUrl: '', body: '', button: '' });
  }
}

function addPollOption() {
  if (state.pollOptions.length < MAX_LIST_ROWS) {
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
    payload.button = state.button.trim() || 'Ver opções';
    payload.sections = [
      {
        title: state.sectionTitle.trim(),
        rows: state.rows
          .map((row, index) => ({
            id: `row_${index + 1}`,
            title: row.title.trim(),
            description: row.description.trim() || undefined,
          }))
          .filter(row => row.title),
      },
    ].filter(section => section.rows.length);
  }

  if (state.type === 'carousel') {
    payload.cards = state.cards
      .map((card, index) => ({
        mediaUrl: card.mediaUrl.trim() || undefined,
        body: card.body.trim(),
        buttons: card.button.trim()
          ? [{ id: `card_${index + 1}`, title: card.button.trim() }]
          : [],
      }))
      .filter(card => card.body || card.mediaUrl);
  }

  return payload;
}

function send() {
  if (!isValid.value) return;
  const payload = buildPayload();
  const content = state.type === 'poll' ? state.pollName.trim() : payload.body;
  emit('send', {
    content,
    contentAttributes: { interactive: payload },
  });
}
</script>

<template>
  <div
    class="mx-3 mb-2 rounded-xl border border-n-weak bg-n-solid-2 p-3"
    data-testid="interactive-composer"
  >
    <div class="mb-2 flex items-center justify-between">
      <span class="flex items-center gap-2 text-sm font-medium text-n-slate-12">
        <Icon
          icon="i-lucide-mouse-pointer-click"
          class="size-4 text-n-teal-11"
        />
        {{
          $t('CONVERSATION.REPLYBOX.INTERACTIVE.TITLE', {
            type: currentTypeLabel,
          })
        }}
      </span>
      <button
        type="button"
        class="rounded-lg p-1 text-n-slate-11 hover:bg-n-alpha-1"
        @click="emit('close')"
      >
        <Icon icon="i-lucide-x" class="size-4" />
      </button>
    </div>

    <!-- biblioteca de modelos -->
    <div class="mb-3 rounded-lg border border-dashed border-n-weak p-2">
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
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.TEMPLATE_NAME_PLACEHOLDER')
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
          v-for="template in templates"
          :key="template.id"
          type="button"
          class="group flex items-center gap-1 rounded-lg bg-n-alpha-2 px-2 py-1 text-xs font-medium text-n-slate-12 hover:bg-n-alpha-3"
          :title="$t('CONVERSATION.REPLYBOX.INTERACTIVE.LOAD_TEMPLATE')"
          @click="loadTemplate(template)"
        >
          <Icon icon="i-lucide-bookmark" class="size-3.5 text-n-teal-11" />
          {{ template.name }}
          <span
            role="button"
            tabindex="0"
            class="ml-0.5 text-n-slate-10 hover:text-n-red-11"
            @click.stop="deleteTemplate(template.id)"
          >
            <Icon icon="i-lucide-x" class="size-3" />
          </span>
        </button>
      </div>
    </div>

    <div class="mb-3 flex gap-1.5">
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
        v-if="state.type !== 'poll'"
        v-model="state.body"
        rows="2"
        :placeholder="
          state.type === 'carousel'
            ? 'Texto acima do carrossel'
            : 'Corpo da mensagem'
        "
        class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
      />
      <input
        v-if="state.type !== 'poll'"
        v-model="state.footer"
        :placeholder="
          $t('CONVERSATION.REPLYBOX.INTERACTIVE.FOOTER_PLACEHOLDER')
        "
        class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
      />

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
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.URL_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <input
            v-if="button.kind === 'copy'"
            v-model="button.copyText"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.COPY_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <input
            v-if="button.kind === 'call'"
            v-model="button.phoneNumber"
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
          @click="
            addChip(state.buttons, MAX_QUICK_REPLIES, () => ({
              kind: 'reply',
              title: '',
              url: '',
              copyText: '',
              phoneNumber: '',
            }))
          "
        >
          {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_BUTTON') }}
        </button>
      </template>

      <!-- poll -->
      <template v-if="state.type === 'poll'">
        <input
          v-model="state.pollName"
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
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.POLL_OPTION_PLACEHOLDER', {
                n: index + 1,
              })
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
            v-if="state.pollOptions.length < MAX_LIST_ROWS"
            type="button"
            class="text-xs font-medium text-n-teal-11 hover:underline"
            @click="addPollOption"
          >
            {{
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_ROW', {
                n: MAX_LIST_ROWS,
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

      <!-- list -->
      <template v-if="state.type === 'list'">
        <input
          v-model="state.button"
          :placeholder="
            $t('CONVERSATION.REPLYBOX.INTERACTIVE.MENU_PLACEHOLDER')
          "
          class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
        />
        <input
          v-model="state.sectionTitle"
          :placeholder="
            $t('CONVERSATION.REPLYBOX.INTERACTIVE.SECTION_PLACEHOLDER')
          "
          class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
        />
        <div
          v-for="(row, index) in state.rows"
          :key="index"
          class="flex items-center gap-2"
        >
          <input
            v-model="row.title"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.ROW_PLACEHOLDER', {
                n: index + 1,
              })
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <input
            v-model="row.description"
            :placeholder="
              $t(
                'CONVERSATION.REPLYBOX.INTERACTIVE.ROW_DESCRIPTION_PLACEHOLDER'
              )
            "
            class="w-2/5 rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <button
            v-if="state.rows.length > 1"
            type="button"
            class="rounded-lg p-2 text-n-slate-11 hover:bg-n-alpha-1"
            @click="state.rows.splice(index, 1)"
          >
            <Icon icon="i-lucide-trash-2" class="size-4" />
          </button>
        </div>
        <button
          v-if="state.rows.length < MAX_LIST_ROWS"
          type="button"
          class="self-start text-xs font-medium text-n-teal-11 hover:underline"
          @click="addRow"
        >
          {{
            $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_ROW', {
              n: MAX_LIST_ROWS,
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
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_MEDIA_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <textarea
            v-model="card.body"
            rows="1"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_BODY_PLACEHOLDER', {
                n: index + 1,
              })
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-sm text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
          <input
            v-model="card.button"
            :placeholder="
              $t('CONVERSATION.REPLYBOX.INTERACTIVE.CARD_BUTTON_PLACEHOLDER')
            "
            class="w-full rounded-lg border border-n-weak bg-n-solid-1 px-3 py-2 text-xs text-n-slate-12 outline-none focus:border-n-teal-11/40"
          />
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

    <div class="mt-3 flex justify-end">
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
</template>
