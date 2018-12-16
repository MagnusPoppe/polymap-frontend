<template>
  <div>
    <l-map class="full-screen bg" ref="map" :zoom="4"></l-map>
    <div class="top menu fg" v-if="datasets">
      <h2>Datasets</h2>
      <hr>
      <button
        v-for="(data, name) in datasets"
        @click="setState(data, name)"
        :key="name"
        class="clickable"
        style="display: block; width: 100%"
        :class="{marked: data.displayed}"
      >{{name}}</button>
    </div>

    <div
      class="bottom-right fg"
      v-if="state"
      :class="{disabled: 2 !== state.filter(x => x.selected).length}"
    >
      <button class="clickable" @click="compute('intersection')">Intersection</button>
      <button class="clickable" @click="compute('union')">Union</button>
    </div>

    <div class="bottom-left fg" v-if="state">
      <button
        v-for="feature in state"
        class="clickable"
        :class="{marked: feature.selected}"
        :state="feature.selected ? 'success' : 'active'"
        :key="feature.name"
        @click="select(feature)"
      >{{ feature.name }}</button>
    </div>
  </div>
</template>

<script>
import {
  LMap,
  LTileLayer,
  LMarker,
  LPolyline,
  LLayerGroup,
  LTooltip,
  LPopup,
  LControlZoom,
  LControlAttribution,
  LControlScale,
  LControlLayers,
  geoJSON
} from "vue2-leaflet";

const headers = {
  "Access-Control-Allow-Origin": "*"
};

export default {
  data() {
    return {
      autoId: 0,
      datasets: null,
      map: null,
      stateName: "",
      colors: {
        default: { stroke: "#64B5F6", fill: "#90CAF9" },
        selected: { stroke: "#388E3C", fill: "#4CAF50" }
      },
      state: []
    };
  },
  mounted() {
    this.getDatasets();
    this.$nextTick(() => {
      this.map = this.$refs.map.mapObject;
      this.configureOpenStreetMap();
    });
  },
  methods: {
    /**
     * Marks a feature as selected
     */
    select(feature) {
      feature.selected = !feature.selected;
      if (feature.selected) {
        feature.mapLayer.setStyle({
          color: this.colors.selected.stroke,
          fillColor: this.colors.selected.fill
        });
        this.map.fitBounds(feature.mapLayer.getBounds());
      } else {
        feature.mapLayer.setStyle({
          color: this.colors.default.stroke,
          fillColor: this.colors.default.fill
        });
      }
      this.$forceUpdate();
    },
    /**
     * Adds or removes dataset features from state
     */
    setState(dataset, name) {
      dataset.displayed = !dataset.displayed;
      if (dataset.displayed) {
        dataset.features.forEach(feat => {
          if (!feat.name) {
            feat.name = `${name}-${feat.id}`;
          }
          let poly = [];
          feat.geometry.coordinates.forEach(shape =>
            shape.forEach(p => {
              poly.push(p);
            })
          );
          feat.mapLayer = L.polygon(poly, {
            color: this.colors.default.stroke,
            fillColor: this.colors.default.fill
          }).addTo(this.map);
          this.state.push(feat);
        });
      } else {
        dataset.features.forEach(feat => {
          feat.mapLayer.remove();
          this.state.splice(this.state.indexOf(feat), 1);
        });
      }
      this.$forceUpdate();
    },
    /**
     * COMPUTES THE CENTOID FOR CENTERING MAP
     */
    // centoid(polygon) {
    //   let cx = 0;
    //   let cy = 0;
    //   let area = 0;
    //   polygon.coordinates.forEach(poly => {
    //     for (let i = 0; i < poly.length - 1; i++) {
    //       let p = poly[i];
    //       let p_1 = poly[i + 1];
    //       let areaPartial = p[0] * p_1[1] - p_1[0] * p[1];
    //       cx += (p[0] + p_1[0]) * areaPartial;
    //       cy += (p[1] + p_1[1]) * areaPartial;
    //       area += areaPartial;
    //     }
    //   });
    //   area = (1 / 2) * area;
    //   return L.latLng((1 / (6 * area)) * cx, (1 / (6 * area)) * cy);
    // },
    /**
     * Adds open street map as base-layer for map
     */
    configureOpenStreetMap() {
      this.map.addLayer(
        new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        })
      );
    },
    /**
     * Sends current selection to backend for computing.
     * Supported modes: "union" or "intersection"
     */
    compute(mode) {
      if (this.state.filter(x => x.selected).length !== 2) {
        alert("Exactly 2 features must be selected for computing " + mode);
      }
      let body = { type: "FeatureCollection", features: [] };
      this.state.forEach(feat => {
        if (feat.selected)
          body.features.push({
            type: feat.type,
            properties: feat.properties,
            geometry: {
              type: feat.geometry.type,
              coordinates: feat.geometry.coordinates
            }
          });
      });
      this.$http
        .post(`http://localhost:5000/${mode}`, body, { headers: headers })
        .then(
          function(response) {
            let datasetName = `${mode}-${this.autoId++}`;
            this.datasets[datasetName] = response.data;
            this.datasets[datasetName].features.forEach(feat => {
              feat.id = this.autoId++;
            });
            this.$forceUpdate();
          },
          function(error) {
            console.log(error.statusText);
          }
        );
    },
    /**
     * Gets all datasets on server
     */
    getDatasets() {
      this.$http.get("http://localhost:5000/datasets").then(
        function(response) {
          this.datasets = response.data;
          Object.keys(this.datasets).forEach(key => {
            this.datasets[key].features.forEach(feat => {
              feat.id = this.autoId++;
            });
          });
          this.$forceUpdate();
        },
        function(error) {
          console.err(error.statusText);
        }
      );
    }
  }
};
</script>

<style scoped>
h2,
div,
button {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
}

h2 {
  margin: 0;
  margin-bottom: 4px;
}

.marked {
  border: 1px solid black;
  background-color: darkgray;
  color: white;
}

button {
  border: 1px solid #aaaaaa;
  border-radius: 2px;
  padding: 8px;
  margin: 3px;
}
button:hover {
  border: 1px solid black;
}
.disabled {
  opacity: 0.1;
}

.full-screen {
  position: fixed !important;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
}
.menu {
  padding: 10px 20px;
  border: 1px solid #aaaaaa;
  border-radius: 5px;
  background: white;
}

.top {
  position: fixed !important;
  top: 0;
  right: 0;
  margin: 2.5%;
}

.bottom-left {
  position: fixed !important;
  left: 0;
  bottom: 0;
  margin: 2.5%;
}

.bottom-right {
  position: fixed !important;
  bottom: 0;
  right: 0;
  margin: 2.5%;
}

.clickable {
  cursor: pointer;
}
.bg {
  z-index: 0;
}
.fg {
  z-index: 1;
}
</style>
