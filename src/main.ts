import { createApp } from 'vue';
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
  Space,
  Spin,
  Steps,
  Tag,
} from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from './App.vue';
import './styles.css';

const app = createApp(App);

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
  Space,
  Spin,
  Steps,
  Tag,
].forEach((component) => {
  app.use(component);
});

app.mount('#app');
