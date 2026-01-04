import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export interface GithubConfig {
    token: string;
    repo: string;
    branch?: string;
    useJsDelivr?: boolean;
}

export interface LocalConfig {
    serverUrl: string;
}

const SETTINGS_KEY = 'wemd-settings';

export const useSettingsStore = defineStore('settings', () => {
    const githubConfig = ref<GithubConfig | undefined>(undefined);
    const localConfig = ref<LocalConfig | undefined>(undefined);

    // Load from localStorage
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            githubConfig.value = data.githubConfig;
            localConfig.value = data.localConfig;
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    }

    // Persist to localStorage
    watch([githubConfig, localConfig], () => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
            githubConfig: githubConfig.value,
            localConfig: localConfig.value,
        }));
    }, { deep: true });

    return {
        githubConfig,
        localConfig,
    };
});
