<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
    @click="handleOverlayClick"
  >
    <div
      class="max-h-[90vh] w-[90%] max-w-[600px] overflow-y-auto rounded-lg bg-white shadow-lg md:w-[95%] md:mx-4"
      @click.stop
    >
      <div class="flex items-center justify-between border-b border-secondary-200 px-8 py-6 md:px-4 md:py-4">
        <h3 class="m-0 text-secondary-900">{{ title }}</h3>
        <button
          class="flex h-[30px] w-[30px] items-center justify-center rounded-full border-0 bg-transparent p-0 text-2xl text-secondary-500 transition-colors hover:bg-secondary-100"
          @click="$emit('close')"
        >
          ×
        </button>
      </div>

      <div class="p-8 md:p-4">
        <slot></slot>
      </div>

      <div
        v-if="$slots.footer"
        class="flex justify-end gap-4 border-t border-secondary-200 px-8 py-6 md:flex-col md:px-4 md:py-4 [&_.btn]:md:w-full"
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
