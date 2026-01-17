<template>
  <div class="print-header">
    <div class="header-top">
      <h1 class="company-name">{{ companyName }} {{ documentTitle }}</h1>
    </div>
    <div class="company-info">
      <div class="company-address">{{ address }}</div>
      <div class="company-contact">
        <span v-if="phone">TEL:{{ phone }}</span>
        <span v-if="phone && fax"> | </span>
        <span v-if="fax">FAX:{{ fax }}</span>
      </div>
    </div>
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
  margin-bottom: 20px;
}

.header-top {
  margin-bottom: 10px;
  text-align: center;
}

.company-name {
  font-size: 18pt;
  font-weight: bold;
  margin: 0;
}

.company-info {
  margin-bottom: 10px;
  text-align: center;
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
</style>
