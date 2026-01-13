<template>
  <div class="print-header">
    <div class="company-info">
      <h1 class="company-name">{{ companyName }}</h1>
      <div class="company-address">{{ address }}</div>
      <div class="company-contact">
        <span v-if="phone">TEL:{{ phone }}</span>
        <span v-if="fax">FAX:{{ fax }}</span>
      </div>
    </div>
    <div class="document-title">{{ documentTitle }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  companyName: string;
  address: string;
  phone?: string;
  fax?: string;
  documentTitle: string;
}

defineProps<Props>();
</script>

<style scoped>
.print-header {
  text-align: center;
  margin-bottom: 20px;
}

.company-info {
  margin-bottom: 10px;
}

.company-name {
  font-size: 18pt;
  font-weight: bold;
  margin-bottom: 5px;
}

.company-address {
  font-size: 11pt;
  margin-bottom: 5px;
}

.company-contact {
  font-size: 10pt;
  display: flex;
  justify-content: center;
  gap: 15px;
}

.document-title {
  font-size: 20pt;
  font-weight: bold;
  margin-top: 10px;
}
</style>
