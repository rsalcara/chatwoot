<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseBubble from 'next/message/bubbles/Base.vue';
import FormattedContent from './Text/FormattedContent.vue';
import Icon from 'next/icon/Icon.vue';
import { useMessageContext } from '../provider.js';
import { emitter } from 'shared/helpers/mitt';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import {
  getInteractive,
  isInteractiveReply,
  pollOptions,
} from '../helpers/interactive';

const { t } = useI18n();
const { content, contentAttributes, attachments, conversationId } =
  useMessageContext();

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

// The platform may attach aggregated vote counts to the poll payload
// (content_attributes.interactive.votes = { optionName: count }).
const pollVotes = computed(() => interactive.value?.votes || null);

const showPollVotes = ref(false);

// Tappable poll: the agent can mark options like the customer does; counts
// combine platform-provided votes with the options selected here.
const selectedPollOptions = ref([]);

function togglePollOption(optionName) {
  const multi = (interactive.value?.selectableCount || 1) > 1;
  if (multi) {
    const index = selectedPollOptions.value.indexOf(optionName);
    if (index >= 0) selectedPollOptions.value.splice(index, 1);
    else selectedPollOptions.value.push(optionName);
  } else {
    selectedPollOptions.value = [optionName];
  }
  showPollVotes.value = true;
}

const pollVoteCounts = computed(() => {
  const counts = { ...(pollVotes.value || {}) };
  selectedPollOptions.value.forEach(name => {
    counts[name] = (counts[name] || 0) + 1;
  });
  return counts;
});

function votePercent(optionName) {
  const votes = pollVoteCounts.value;
  const total = Object.values(votes).reduce(
    (sum, count) => sum + (count || 0),
    0
  );
  if (!total) return 0;
  return Math.round(((votes[optionName] || 0) / total) * 100);
}

const pollFooter = computed(() => {
  const count = interactive.value?.selectableCount || 1;
  return count > 1
    ? t('CONVERSATION.REPLYBOX.INTERACTIVE.POLL_FOOTER_MULTI', { count })
    : t('CONVERSATION.REPLYBOX.INTERACTIVE.POLL_FOOTER_SINGLE');
});

const chips = computed(() => {
  const payload = interactive.value;
  if (!payload || isReply.value) return [];
  if (payload.type === 'buttons') return payload.buttons;
  if (payload.type === 'list' && payload.button) {
    return [{ type: 'reply', title: payload.button }];
  }
  return [];
});

const isCarousel = computed(() => interactive.value?.type === 'carousel');

const isImage = computed(() => interactive.value?.type === 'image');
const isSticker = computed(() => interactive.value?.type === 'sticker');
const isVideo = computed(() => interactive.value?.type === 'video');
const isAudio = computed(() => interactive.value?.type === 'audio');
const isDocument = computed(() => interactive.value?.type === 'document');
const isLocation = computed(() => interactive.value?.type === 'location');
const isContact = computed(() => interactive.value?.type === 'contact');
const isReaction = computed(() => interactive.value?.type === 'reaction');

const mapsUrl = computed(() => {
  if (!isLocation.value) return '';
  const { latitude, longitude } = interactive.value;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
});

const locationLabel = computed(() => {
  if (!isLocation.value) return '';
  const place = interactive.value.name || interactive.value.address || '';
  return `📍 ${place}`;
});

const showChips = computed(() => chips.value.length > 0 && !isCarousel.value);

const cards = computed(() => {
  const payload = interactive.value;
  if (!payload || payload.type !== 'carousel') return [];
  // Only pair message attachments with cards when there is exactly one
  // attachment per card; otherwise an unrelated attachment could be shown.
  const paired = attachments.value?.length === payload.cards.length;
  return payload.cards.map((card, index) => {
    const attachmentImage = paired
      ? attachments.value?.[index]?.dataUrl || ''
      : '';
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
  if (button.type === 'url') {
    try {
      const url = new URL(button.url);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '#';
    } catch {
      return '#';
    }
  }
  if (button.type === 'call')
    return button.phoneNumber ? `tel:${button.phoneNumber}` : '#';
  return null;
}

function copyChipText(button) {
  if (button.copyText && navigator.clipboard) {
    navigator.clipboard.writeText(button.copyText).catch(() => {});
  }
}

// Drag-to-scroll for the carousel with a mouse (touch keeps native swipe).
const carouselEl = ref(null);
let carouselDragStartX = 0;
let carouselDragStartScroll = 0;
let carouselDragged = false;

function onCarouselPointerDown(event) {
  if (event.pointerType !== 'mouse') return;
  carouselDragged = false;
  carouselDragStartX = event.clientX;
  carouselDragStartScroll = carouselEl.value?.scrollLeft || 0;
}

function onCarouselPointerMove(event) {
  if (event.pointerType !== 'mouse' || event.buttons !== 1) return;
  if (!carouselEl.value) return;
  const delta = event.clientX - carouselDragStartX;
  if (Math.abs(delta) > 4) carouselDragged = true;
  if (delta) carouselEl.value.scrollLeft = carouselDragStartScroll - delta;
}

function onCarouselClickCapture(event) {
  if (carouselDragged) {
    event.preventDefault();
    event.stopPropagation();
    carouselDragged = false;
  }
}

function scrollCarousel(direction) {
  const el = carouselEl.value;
  if (!el) return;
  const card = el.querySelector('[data-carousel-card]');
  const step = card ? (card.offsetWidth + 10) * 2 : el.clientWidth * 0.8;
  el.scrollBy({ left: direction * step, behavior: 'smooth' });
}

// Lets the agent simulate the customer tapping a reply button or picking a
// list row, mirroring how the interactive behaves on the WhatsApp app.
const showListPicker = ref(false);

function emitSimulatedReply(reply) {
  emitter.emit(BUS_EVENTS.INTERACTIVE_SIMULATE_TAP, {
    conversationId: conversationId.value,
    reply,
  });
}

function simulateTap(button) {
  emitSimulatedReply({
    type: 'button_reply',
    id: button.id,
    title: button.title,
  });
}

function pickListRow(row) {
  showListPicker.value = false;
  emitSimulatedReply({
    type: 'list_reply',
    id: row.id,
    title: row.title,
    description: row.description || '',
  });
}
</script>

<template>
  <BaseBubble
    class="px-3.5 py-2.5 !bg-n-solid-1"
    :class="{ '!max-w-full': isCarousel }"
    data-bubble-name="interactive"
  >
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

      <!-- carousel footer renders above the cards, like the app -->
      <span v-if="isCarousel && footerText" class="text-xs text-n-slate-10">
        {{ footerText }}
      </span>

      <!-- poll -->
      <div
        v-if="isPoll"
        class="flex flex-col gap-2 rounded-lg border border-n-weak px-3 py-2"
        data-testid="interactive-poll"
      >
        <button
          v-for="(option, optionIndex) in pollItems"
          :key="optionIndex"
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-start text-sm text-n-slate-12 hover:bg-n-alpha-1"
          @click="togglePollOption(option.name)"
        >
          <span
            class="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-n-strong/40"
            :class="{
              'rounded-md': pollMulti,
              'bg-n-teal-11 border-n-teal-11': selectedPollOptions.includes(
                option.name
              ),
            }"
          >
            <Icon
              v-if="selectedPollOptions.includes(option.name)"
              icon="i-lucide-check"
              class="size-3 text-white"
            />
          </span>
          {{ option.name }}
        </button>
        <button
          v-if="pollVotes || selectedPollOptions.length"
          type="button"
          class="self-start text-xs font-medium text-n-teal-11 hover:underline"
          @click="showPollVotes = !showPollVotes"
        >
          {{
            showPollVotes
              ? $t('CONVERSATION.REPLYBOX.INTERACTIVE.HIDE_VOTES')
              : $t('CONVERSATION.REPLYBOX.INTERACTIVE.SHOW_VOTES')
          }}
        </button>
        <div
          v-if="showPollVotes && (pollVotes || selectedPollOptions.length)"
          class="flex flex-col gap-1.5"
        >
          <div
            v-for="(option, optionIndex) in pollItems"
            :key="`vote-${optionIndex}`"
            class="flex flex-col gap-0.5"
          >
            <div
              class="flex items-center justify-between text-xs text-n-slate-12"
            >
              <span>{{ option.name }}</span>
              <span>{{ pollVoteCounts[option.name] || 0 }}</span>
            </div>
            <div class="h-1.5 w-full rounded-full bg-n-alpha-2">
              <div
                class="h-full rounded-full bg-n-teal-11"
                :style="{ width: votePercent(option.name) + '%' }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- list: content stays hidden in the conversation (WhatsApp keeps it
           behind the menu button); it opens in the picker only -->
      <div
        v-if="sections.length && !interactive.button"
        class="flex flex-col gap-2 rounded-lg border border-n-weak px-3 py-2"
      >
        <div
          v-for="(section, sectionIndex) in sections"
          :key="sectionIndex"
          class="flex flex-col"
        >
          <span
            v-if="section.title"
            class="text-xs font-medium uppercase text-n-slate-10"
          >
            {{ section.title }}
          </span>
          <span
            v-for="(row, rowIndex) in section.rows || []"
            :key="rowIndex"
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
      <div v-if="isCarousel" class="relative min-w-0">
        <div
          ref="carouselEl"
          class="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory cursor-grab select-none active:cursor-grabbing [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
          data-testid="interactive-carousel"
          @pointerdown="onCarouselPointerDown"
          @pointermove="onCarouselPointerMove"
          @click.capture="onCarouselClickCapture"
        >
          <div
            v-for="(card, index) in cards"
            :key="index"
            data-carousel-card
            class="w-36 grow min-w-36 max-w-56 shrink-0 overflow-hidden rounded-xl bg-n-solid-1 shadow-sm snap-start"
          >
            <img
              v-if="card.media"
              :src="card.media"
              class="h-28 w-full object-cover"
              alt=""
              draggable="false"
            />
            <div class="flex flex-col gap-2 p-3">
              <p
                v-if="card.title"
                class="text-sm font-semibold text-n-slate-12"
              >
                {{ card.title }}
              </p>
              <p v-if="card.body" class="text-sm text-n-slate-12">
                {{ card.body }}
              </p>
              <template
                v-for="(button, buttonIndex) in card.buttons"
                :key="buttonIndex"
              >
                <a
                  v-if="button.type === 'url' && button.url"
                  :href="chipHref(button)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-xs font-medium text-n-teal-11 hover:bg-n-alpha-1"
                >
                  <Icon :icon="chipIcon('url')" class="size-3.5" />
                  {{ button.title }}
                </a>
                <button
                  v-else-if="button.type === 'copy'"
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-xs font-medium text-n-teal-11 hover:bg-n-alpha-1"
                  @click="copyChipText(button)"
                >
                  <Icon :icon="chipIcon('copy')" class="size-3.5" />
                  {{ button.title }}
                </button>
                <a
                  v-else-if="button.type === 'call'"
                  :href="chipHref(button)"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-xs font-medium text-n-teal-11 hover:bg-n-alpha-1"
                >
                  <Icon :icon="chipIcon('call')" class="size-3.5" />
                  {{ button.title }}
                </a>
                <button
                  v-else
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-n-weak py-2 text-center text-xs font-medium text-n-teal-11 hover:bg-n-alpha-1"
                  @click="simulateTap(button)"
                >
                  <Icon :icon="chipIcon('reply')" class="size-3.5" />
                  {{ button.title }}
                </button>
              </template>
              <span v-if="card.footer" class="text-xs text-n-slate-10">
                {{ card.footer }}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="absolute start-1 top-1/2 -translate-y-1/2 rounded-full border border-n-weak bg-n-solid-1 p-1 text-n-slate-11 shadow-sm hover:bg-n-alpha-2"
          :aria-label="$t('CONVERSATION.REPLYBOX.INTERACTIVE.SCROLL_LEFT')"
          @click="scrollCarousel(-1)"
        >
          <Icon icon="i-lucide-chevron-left" class="size-4" />
        </button>
        <button
          type="button"
          class="absolute end-1 top-1/2 -translate-y-1/2 rounded-full border border-n-weak bg-n-solid-1 p-1 text-n-slate-11 shadow-sm hover:bg-n-alpha-2"
          :aria-label="$t('CONVERSATION.REPLYBOX.INTERACTIVE.SCROLL_RIGHT')"
          @click="scrollCarousel(1)"
        >
          <Icon icon="i-lucide-chevron-right" class="size-4" />
        </button>
      </div>

      <!-- image / sticker -->
      <img
        v-if="isImage"
        :src="interactive.url"
        class="max-w-56 rounded-lg"
        alt=""
        draggable="false"
      />
      <img
        v-if="isSticker"
        :src="interactive.url"
        class="w-36"
        alt=""
        draggable="false"
      />
      <span
        v-if="(isImage || isVideo || isAudio) && interactive.viewOnce"
        class="w-fit rounded-md bg-n-alpha-2 px-2 py-0.5 text-xs text-n-slate-11"
      >
        {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.VIEW_ONCE') }}
      </span>

      <!-- video / audio -->
      <video
        v-if="isVideo"
        :src="interactive.url"
        controls
        class="max-w-56 rounded-lg"
      />
      <audio v-if="isAudio" :src="interactive.url" controls class="w-56" />

      <!-- document -->
      <a
        v-if="isDocument"
        :href="interactive.url"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 rounded-lg border border-n-weak px-3 py-2 text-sm text-n-teal-11 hover:bg-n-alpha-1"
      >
        <Icon icon="i-lucide-file-text" class="size-4" />
        {{ interactive.fileName || interactive.url }}
      </a>

      <!-- location -->
      <div
        v-if="isLocation"
        class="flex flex-col gap-1 rounded-lg border border-n-weak px-3 py-2"
      >
        <span class="text-sm font-medium text-n-slate-12">
          {{ locationLabel }}
        </span>
        <span
          v-if="interactive.name && interactive.address"
          class="text-xs text-n-slate-10"
        >
          {{ interactive.address }}
        </span>
        <a
          :href="mapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="w-fit text-xs text-n-teal-11 hover:underline"
        >
          {{ $t('CONVERSATION.REPLYBOX.INTERACTIVE.OPEN_MAPS') }}
        </a>
      </div>

      <!-- contact -->
      <div
        v-if="isContact"
        class="flex items-center gap-2 rounded-lg border border-n-weak px-3 py-2"
      >
        <Icon icon="i-lucide-contact" class="size-5 text-n-slate-11" />
        <span class="text-sm text-n-slate-12">{{ interactive.name }}</span>
      </div>

      <!-- reaction -->
      <div v-if="isReaction" class="text-3xl leading-none">
        {{ interactive.reaction }}
      </div>

      <!-- footer (carousel already renders it above the cards) -->
      <span v-if="footerText && !isCarousel" class="text-xs text-n-slate-10">
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
        <template v-for="(chip, chipIndex) in chips" :key="chipIndex">
          <a
            v-if="chip.type === 'url' && chip.url"
            :href="chipHref(chip)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-n-solid-1 py-2 text-center text-sm font-medium text-n-teal-11 shadow-sm hover:bg-n-alpha-1"
          >
            <Icon :icon="chipIcon('url')" class="size-3.5" />
            {{ chip.title }}
          </a>
          <button
            v-else-if="chip.type === 'copy'"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-n-solid-1 py-2 text-center text-sm font-medium text-n-teal-11 shadow-sm hover:bg-n-alpha-1"
            @click="copyChipText(chip)"
          >
            <Icon :icon="chipIcon('copy')" class="size-3.5" />
            {{ chip.title }}
          </button>
          <a
            v-else-if="chip.type === 'call'"
            :href="chipHref(chip)"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-n-solid-1 py-2 text-center text-sm font-medium text-n-teal-11 shadow-sm hover:bg-n-alpha-1"
          >
            <Icon :icon="chipIcon('call')" class="size-3.5" />
            {{ chip.title }}
          </a>
          <button
            v-else-if="interactive.type === 'buttons'"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-n-solid-1 py-2 text-center text-sm font-medium text-n-teal-11 shadow-sm hover:bg-n-alpha-1"
            @click="simulateTap(chip)"
          >
            <Icon :icon="chipIcon('reply')" class="size-3.5" />
            {{ chip.title }}
          </button>
          <button
            v-else-if="interactive.type === 'list' && sections.length"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-n-solid-1 py-2 text-center text-sm font-medium text-n-teal-11 shadow-sm hover:bg-n-alpha-1"
            @click="showListPicker = true"
          >
            <Icon :icon="chipIcon('list')" class="size-3.5" />
            {{ chip.title }}
          </button>
          <span
            v-else
            class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-n-solid-1 py-2 text-center text-sm font-medium text-n-teal-11 shadow-sm"
          >
            <Icon :icon="chipIcon('list')" class="size-3.5" />
            {{ chip.title }}
          </span>
        </template>
      </div>
    </div>

    <!-- list picker: mirrors the WhatsApp sheet for choosing a row -->
    <woot-modal
      v-model:show="showListPicker"
      :on-close="() => (showListPicker = false)"
      size="modal-medium"
    >
      <woot-modal-header
        :header-title="
          interactive.button ||
          interactive.header ||
          $t('CONVERSATION.REPLYBOX.INTERACTIVE.MENU_FALLBACK')
        "
        :header-content="interactive.body"
      />
      <div class="flex max-h-[60vh] flex-col gap-3 px-6 pb-5 overflow-y-auto">
        <div
          v-for="(section, sectionIndex) in sections"
          :key="sectionIndex"
          class="flex flex-col gap-1"
        >
          <span
            v-if="section.title"
            class="text-xs font-medium uppercase text-n-slate-10"
          >
            {{ section.title }}
          </span>
          <button
            v-for="(row, rowIndex) in section.rows"
            :key="rowIndex"
            type="button"
            class="flex flex-col items-start gap-0.5 rounded-lg border border-n-weak px-3 py-2 text-start hover:bg-n-alpha-1"
            @click="pickListRow(row)"
          >
            <span class="text-sm text-n-slate-12">{{ row.title }}</span>
            <span v-if="row.description" class="text-xs text-n-slate-10">
              {{ row.description }}
            </span>
          </button>
        </div>
      </div>
    </woot-modal>
  </BaseBubble>
</template>
