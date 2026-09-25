<script setup>
import { computed, reactive } from 'vue';
import Icon from 'next/icon/Icon.vue';
import {
  MAX_BUTTONS,
  MAX_CARDS,
  MAX_LIST_ROWS,
} from 'next/message/helpers/interactive';

const emit = defineEmits(['send', 'close']);

const TYPES = [
  { value: 'buttons', label: 'Botões', icon: 'i-lucide-message-square-more' },
  { value: 'list', label: 'Lista', icon: 'i-lucide-list' },
  {
    value: 'carousel',
    label: 'Carrossel',
    icon: 'i-lucide-gallery-horizontal',
  },
];

const state = reactive({
  type: 'buttons',
  body: '',
  footer: '',
  button: 'Ver opções',
  buttons: [{ title: '' }, { title: '' }],
  sectionTitle: '',
  rows: [{ title: '', description: '' }],
  cards: [{ mediaUrl: '', body: '', button: '' }],
});

const currentTypeLabel = computed(
  () => TYPES.find(type => type.value === state.type)?.label
);

const isValid = computed(() => {
  if (!state.body.trim()) return false;
  if (state.type === 'buttons') {
    const titles = state.buttons
      .map(button => button.title.trim())
      .filter(Boolean);
    return titles.length > 0;
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

function addChip(list, max) {
  if (list.length < max) list.push({ title: '' });
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

function buildPayload() {
  const payload = { type: state.type, body: state.body.trim() };
  if (state.footer.trim()) payload.footer = state.footer.trim();

  if (state.type === 'buttons') {
    payload.buttons = state.buttons
      .map((button, index) => ({
        id: `btn_${index + 1}`,
        title: button.title.trim(),
      }))
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
  emit('send', {
    content: payload.body,
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
          class="flex items-center gap-2"
        >
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
        <button
          v-if="state.buttons.length < MAX_BUTTONS"
          type="button"
          class="self-start text-xs font-medium text-n-teal-11 hover:underline"
          @click="addChip(state.buttons, MAX_BUTTONS)"
        >
          {{
            $t('CONVERSATION.REPLYBOX.INTERACTIVE.ADD_BUTTON', {
              n: MAX_BUTTONS,
            })
          }}
        </button>
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
