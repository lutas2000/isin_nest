<template>
  <div class="mb-8 flex items-center justify-between gap-4 rounded-lg bg-white p-8 shadow md:flex-col md:text-center">
    <div>
      <h1 class="mb-2 text-secondary-900">{{ title }}</h1>
      <p v-if="description" class="m-0 text-secondary-600">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex gap-4 md:w-full md:justify-center">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
}

defineProps<Props>();
</script>
