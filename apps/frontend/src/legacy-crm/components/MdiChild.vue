<script setup lang="ts">
import { provide, toRef } from 'vue';
import { CLOSE_WINDOW_KEY, WINDOW_ACTIVE_KEY } from '../utils/legacyWindow';

// Hosts one form inside the main window and tells it whether it is the
// active window and how to close itself.
const props = defineProps({ active: { type: Boolean, default: false } });
const emit = defineEmits(['close']);
provide(WINDOW_ACTIVE_KEY, toRef(props, 'active'));
provide(CLOSE_WINDOW_KEY, () => emit('close'));
</script>

<template>
  <slot />
</template>
