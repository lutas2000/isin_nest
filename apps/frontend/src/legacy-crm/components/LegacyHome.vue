<script setup lang="ts">
import releases from '../releases.json';
import { companyProfile } from '../utils/companyProfile';

// 發布紀錄由新到舊排列，第一筆就是目前版本。
const currentVersion = releases[0].version;
</script>

<template>
  <section class="legacy-backdrop" aria-label="舊版銷管首頁" tabindex="0">
    <div class="legacy-backdrop-panel">
      <h1 class="legacy-backdrop-title">雷射銷管軟體系統</h1>
      <p class="legacy-backdrop-company">{{ companyProfile.name }}</p>
      <p class="legacy-home-version">目前版本：{{ currentVersion }}</p>
      <div class="legacy-backdrop-rule"></div>

      <section
        class="legacy-release-notes"
        aria-labelledby="legacy-release-title"
      >
        <h2 id="legacy-release-title">更新紀錄（Release Notes）</h2>
        <article
          v-for="release in releases"
          :key="release.version"
          class="legacy-release"
        >
          <h3>{{ release.version }}</h3>
          <ul>
            <li v-for="note in release.notes" :key="note">{{ note }}</li>
          </ul>
        </article>
      </section>
    </div>
  </section>
</template>
