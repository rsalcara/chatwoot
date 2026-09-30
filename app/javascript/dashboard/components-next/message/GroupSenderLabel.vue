<script setup>
import Avatar from 'next/avatar/Avatar.vue';

defineProps({
  name: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
});
</script>

<template>
  <div
    class="flex items-center gap-1.5 ltr:pl-1 rtl:pr-1"
    data-testid="group-sender-label"
  >
    <Avatar :src="avatarUrl" :name="name" :size="18" rounded-full />
    <span class="text-xs leading-4 font-medium text-n-slate-12">
      {{ name }}
    </span>
  </div>
</template>
