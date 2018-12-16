// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import SuiVue from 'semantic-ui-vue';
import VueResource from 'vue-resource';
import {
  L,
  LMap,
  LTileLayer,
  LMarker
} from 'vue2-leaflet';
import 'leaflet/dist/leaflet.css'


Vue.component('l-map', LMap);
Vue.component('l-tile-layer', LTileLayer);
Vue.component('l-marker', LMarker);


Vue.use(VueResource);
Vue.config.productionTip = false
Vue.use(SuiVue);

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: {
    App
  },
  http: {

  },
  template: '<App/>'
})
