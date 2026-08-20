import { createApp } from 'vue';
import { createPinia } from 'pinia';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Tag,
} from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from './App.vue';
import router from './router';
import './styles/base.css';
import './styles/antd-overrides.css';
import './styles/components.css';

const app = createApp(App);
const pinia = createPinia();

[
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Tag,
].forEach((component) => {
  app.use(component);
});

app.use(pinia);
app.use(router);
app.mount('#app');
