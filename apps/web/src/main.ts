import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './index.css';
import './styles/global.css';

const app = createApp(App);
const pinia = createPinia();

// 注册 v-focus 指令
app.directive('focus', {
  mounted(el) {
    el.focus();
  }
});

app.use(pinia);
app.mount('#app');
