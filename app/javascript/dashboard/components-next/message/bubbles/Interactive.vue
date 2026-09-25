<script setup>
import { computed } from 'vue';
import BaseBubble from 'next/message/bubbles/Base.vue';
import FormattedContent from './Text/FormattedContent.vue';
import Icon from 'next/icon/Icon.vue';
import { useMessageContext } from '../provider.js';
import {
  getInteractive,
  isInteractiveReply,
  pollOptions,
} from '../helpers/interactive';

const { content, contentAttributes, attachments } = useMessageContext();

const interactive = computed(() => getInteractive(contentAttributes.value));

const isReply = computed(() => isInteractiveReply(interactive.value));

const replyIcon = computed(() =>
  interactive.value?.type === 'list_reply'
    ? 'i-lucide-list'
    : 'i-lucide-message-square-dot'
);

const replyLabel = computed(() => interactive.value?.title || '');

const bodyText = computed(() => {
  if (isReply.value) return content.value || replyLabel.value;
  return interactive.value?.body || content.value || '';
});

const headerText = computed(() =>
  isReply.value ? '' : interactive.value?.header || ''
);

const footerText = computed(() =>
  isReply.value ? '' : interactive.value?.footer || ''
);

const isPoll = computed(() => interactive.value?.type === 'poll');

const pollItems = computed(() => pollOptions(interactive.value));

const pollMulti = computed(() => (interactive.value?.selectableCount || 1) > 1);

const pollFooter = computed(() => {
  const count = interactive.value?.selectableCount || 1;
  return count > 1 ? `Selecione até ${count} opções` : 'Selecione uma opção';
});

const chips = computed(() => {
  const payload = interactive.value;
  if (!payload || isReply.value) return [];
  if (payload.type === 'buttons') return payload.buttons;
  if (payload.type === 'list') {
    return [{ type: 'reply', title: payload.button || 'Menu' }];
  }
  return [];
});

const isCarousel = computed(() => interactive.value?.type === 'carousel');

const showChips = computed(() => chips.value.length > 0 && !isCarousel.value);

const cards = computed(() => {
  const payload = interactive.value;
  if (!payload || payload.type !== 'carousel') return [];
  return payload.cards.map((card, index) => {
    const attachmentImage = attachments.value?.[index]?.dataUrl || '';
    return {
      media: card.mediaUrl || card.imageUrl || attachmentImage || '',
      body: card.body || '',
      buttons: Array.isArray(card.buttons) ? card.buttons : [],
    };
  });
});

const sections = computed(() => {
  const payload = interactive.value;
  if (!payload || payload.type !== 'list') return [];
  return payload.sections;
});

const chipIcon = type => {
  if (type === 'url') return 'i-lucide-external-link';
  if (type === 'copy') return 'i-lucide-copy';
  if (type === 'call') return 'i-lucide-phone';
  return 'i-lucide-chevron-right';
};

function chipHref(button) {
  if (button.type === 'url') return button.url || '#';
  if (button.type === 'call')
    return button.phoneNumber ? `tel:${button.phoneNumber}` : '#';
  return null;
}

function copyChipText(button) {
  if (button.copyText && navigator.clipboard) {
    navigator.clipboard.writeText(button.copyText);
  }
}
</script>

<template>
  <BaseBubble class="px-3.5 py-2.5" data-bubble-name="interactive">
    <div class="flex flex-col gap-2 min-w-0">
      <!-- received reply: badge with the tapped option -->
      <span
        v-if="isReply"
        class="inline-flex items-center gap-1.5 self-start rounded-md bg-n-alpha-2 px-2 py-0.5 text-xs font-medium text-n-slate-11"
        data-testid="interactive-reply"
      >
        <Icon :icon="replyIcon" class="size-3.5" />
        {{ replyLabel }}
      </span>

      <span v-if="headerText" class="text-sm font-semibold text-n-slate-12">
        {{ headerText }}
      </span>

      <FormattedContent
        v-if="bodyText"
        :content="bodyText"
        class="text-sm text-n-slate-12"
      />

      <!-- poll -->
      <div
        v-if="isPoll"
        class="flex flex-col gap-2 rounded-lg border border-n-weak px-3 py-2"
        data-testid="interactive-poll"
      >
        <span
          v-for="option in pollItems"
          :key="option.name"
          class="flex items-center gap-2 text-sm text-n-slate-12"
        >
          <span
            class="inline-flex size-4 items-center justify-center rounded-full border border-n-strong/40"
            :class="{ 'rounded-md': pollMulti }"
          />
          {{ option.name }}
        </span>
      </div>

      <!-- list sections preview -->
      <div
        v-if="sections.length"
        class="flex flex-col gap-2 rounded-lg border border-n-weak px-3 py-2"
      >
        <div
          v-for="section in sections"
          :key="section.title"
          class="flex flex-col"
        >
          <span
            v-if="section.title"
            class="text-xs font-medium uppercase text-n-slate-10"
          >
            {{ section.title }}
          </span>
          <span
            v-for="row in section.rows || []"
            :key="row.id"
            class="text-sm text-n-slate-12"
          >
            {{ row.title }}
            <span v-if="row.description" class="text-xs text-n-slate-10">
              {{ row.description }}
            </span>
          </span>
        </div>
      </div>

      <!-- carousel cards -->
      <div
        v-if="isCarousel"
        class="flex gap-2.5 overflow-x-auto pb-1"
        data-testid="interactive-carousel"
      >
        <div
          v-for="(card, index) in cards"
          :key="index"
          class="w-52 shrink-0 overflow-hidden rounded-xl border border-n-weak bg-n-solid-1"
        >
          <img
            v-if="card.media"
            :src="card.media"
            class="h-32 w-full object-cover"
            alt=""
          />
          <div class="flex flex-col gap-2 p-3">
            <p v-if="card.body" class="text-sm text-n-slate-12">
              {{ card.body }}
            </p>
            <span
              v-for="button in card.buttons"
              :key="button.id"
              class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-sm font-medium text-n-teal-11"
            >
              <Icon :icon="chipIcon(button.type)" class="size-3.5" />
              {{ button.title }}
            </span>
          </div>
        </div>
      </div>

      <!-- footer -->
      <span v-if="footerText" class="text-xs text-n-slate-10">
        {{ footerText }}
      </span>
      <span v-if="isPoll" class="text-xs text-n-slate-10">
        {{ pollFooter }}
      </span>

      <!-- action chips (buttons / list menu) -->
      <div
        v-if="showChips"
        class="flex flex-col gap-2"
        data-testid="interactive-chips"
      >
        <template v-for="chip in chips" :key="chip.id || chip.title">
          <a
            v-if="chip.type === 'url' && chip.url"
            :href="chipHref(chip)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-sm font-medium text-n-teal-11"
          >
            <Icon :icon="chipIcon('url')" class="size-3.5" />
            {{ chip.title }}
          </a>
          <button
            v-else-if="chip.type === 'copy'"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-sm font-medium text-n-teal-11"
            @click="copyChipText(chip)"
          >
            <Icon :icon="chipIcon('copy')" class="size-3.5" />
            {{ chip.title }}
          </button>
          <a
            v-else-if="chip.type === 'call'"
            :href="chipHref(chip)"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-sm font-medium text-n-teal-11"
          >
            <Icon :icon="chipIcon('call')" class="size-3.5" />
            {{ chip.title }}
          </a>
          <span
            v-else
            class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-sm font-medium text-n-teal-11"
          >
            <Icon
              :icon="
                interactive.type === 'list'
                  ? 'i-lucide-list'
                  : 'i-lucide-chevron-right'
              "
              class="size-3.5"
            />
            {{ chip.title }}
          </span>
        </template>
      </div>
    </div>
  </BaseBubble>
</template>
