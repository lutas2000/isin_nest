<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-6 md:p-4"
    @click="handleOverlayClick"
  >
    <div
      class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-lg"
      @click.stop
    >
      <div class="flex items-center justify-between border-b border-secondary-200 px-8 py-5 md:px-6 md:py-4">
        <h3 class="m-0 text-secondary-900">{{ title }}</h3>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-full border-0 bg-transparent p-0 text-3xl leading-none text-secondary-500 transition-colors hover:bg-secondary-100"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <div class="px-8 py-6 md:px-6 md:py-5">
        <slot></slot>
      </div>

      <div
        v-if="$slots.footer"
        class="flex justify-end gap-3 border-t border-secondary-200 px-8 py-5 md:flex-col-reverse md:px-6 md:py-4 [&_.btn]:min-h-11 [&_.btn]:px-5 [&_.btn]:py-2.5 [&_.btn]:text-sm [&_.btn]:font-medium [&_.btn]:md:w-full"
      >
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  title: string;
  closeOnOverlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  closeOnOverlay: true
});

const emit = defineEmits<{
  close: [];
}>();

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    emit('close');
  }
};
</script>
