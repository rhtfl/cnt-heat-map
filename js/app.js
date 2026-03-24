(function () {
    "use strict";

    var WAREHOUSE_MAP = {
        MSKVOSTOK: "ИМ Восток",
        MSK: "ИМ Центр",
        MSKSEVER: "ИМ Север",
        NOGINSK: "ИМ Ногинск"
    };

    var COL = {
        coords: "Координаты доставки",
        order: "Номер заказа",
        status: "Статус заказа",
        service: "Служба доставки",
        deliveryDate: "Дата доставки",
        orderCreated: "Дата создания заказа",
        payment: "Способ оплаты",
        amount: "Сумма заказа",
        warehouse: "Склад",
        courier: "Курьер",
        zone: "Зона доставки",
        interval: "Интервал доставки",
        dvd: "ДВД",
        address: "Адрес доставки",
        paymentAgent: "Агент приема платежей"
    };

    var ORDER_CREATED_ALIASES = [
        "Дата создания заказа",
        "Дата создания",
        "Дата оформления заказа",
        "Дата заказа"
    ];

    var CHART_COLORS = [
        "#6c8cff", "#15aabf", "#fcc419", "#fa5252", "#82c91e",
        "#da77f2", "#ff922b", "#5c7cfa", "#20c997", "#ff6b6b"
    ];

    var MAP_PRESET_STORAGE = "cntHeatMap.mapPreset";
    var MAP_LABELS_STORAGE = "cntHeatMap.mapShowLabels";

    var ESRI_DARK_GRAY_REFERENCE_URL =
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";

    var SECTOR_STYLE_STORAGE = "cntHeatMap.sectorStyle";

    var sectorStyle = {
        fillColor: "#6c8cff",
        fillOpacity: 0.22,
        color: "#b4c8ff",
        opacity: 0.85,
        weight: 2
    };

    var MAP_PRESETS = [
        {
            id: "dark_blue",
            label: "Тёмная, синий оттенок",
            ui: "dark",
            tileEffect: "blue",
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap &copy; <a href=\"https://carto.com/attributions\" rel=\"noopener\">CARTO</a>",
            subdomains: "abcd",
            maxZoom: 20
        },
        {
            id: "dark_neutral",
            label: "Тёмная нейтральная",
            ui: "dark",
            tileEffect: "none",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
            attribution: "Tiles &copy; <a href=\"https://www.esri.com/\" rel=\"noopener\">Esri</a> — Esri, DeLorme, NAVTEQ",
            maxZoom: 16
        },
        {
            id: "voyager",
            label: "Voyager (цветная)",
            ui: "light",
            tileEffect: "none",
            url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap &copy; <a href=\"https://carto.com/attributions\" rel=\"noopener\">CARTO</a>",
            subdomains: "abcd",
            maxZoom: 20
        },
        {
            id: "light_carto",
            label: "Светлая (CARTO)",
            ui: "light",
            tileEffect: "none",
            url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            attribution: "&copy; OpenStreetMap &copy; <a href=\"https://carto.com/attributions\" rel=\"noopener\">CARTO</a>",
            subdomains: "abcd",
            maxZoom: 20
        },
        {
            id: "osm",
            label: "OpenStreetMap",
            ui: "light",
            tileEffect: "none",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\" rel=\"noopener\">OpenStreetMap</a>",
            subdomains: "abc",
            maxZoom: 19
        }
    ];

    var map = L.map("map", { zoomControl: true }).setView([55.751244, 37.618423], 10);

    var state = {
        allOrders: [],
        baseLayer: null,
        mapReferenceLayer: null,
        activeMapPresetId: null,
        heatLayer: null,
        markers: L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            polygonOptions: {
                fillColor: "#6c8cff",
                fillOpacity: 0.14,
                color: "#6c8cff",
                weight: 2,
                opacity: 0.65
            }
        }),
        kmlLayer: null,
        geojsonLayer: null,
        charts: []
    };

    var els = {
        fileExcel: document.getElementById("file-excel"),
        excelName: document.getElementById("excel-name"),
        btnReset: document.getElementById("btn-reset"),
        btnExport: document.getElementById("btn-export-csv"),
        layerHeat: document.getElementById("layer-heat"),
        layerClusters: document.getElementById("layer-clusters"),
        heatRadius: document.getElementById("heat-radius"),
        heatBlur: document.getElementById("heat-blur"),
        heatRadiusVal: document.getElementById("heat-radius-val"),
        heatBlurVal: document.getElementById("heat-blur-val"),
        heatControls: document.getElementById("heat-controls"),
        fileKml: document.getElementById("file-kml"),
        fileGeojson: document.getElementById("file-geojson"),
        kmlName: document.getElementById("kml-name"),
        geojsonName: document.getElementById("geojson-name"),
        btnClearSectors: document.getElementById("btn-clear-sectors"),
        filterWarehouse: document.getElementById("filter-warehouse"),
        filterStatus: document.getElementById("filter-status"),
        filterService: document.getElementById("filter-service"),
        filterDvd: document.getElementById("filter-dvd"),
        btnFiltersClear: document.getElementById("btn-filters-clear"),
        legend: document.getElementById("legend"),
        mapPreset: document.getElementById("map-preset"),
        mapShowLabels: document.getElementById("map-show-labels"),
        mapLabelsWrap: document.getElementById("map-labels-wrap"),
        sectorFillColor: document.getElementById("sector-fill-color"),
        sectorStrokeColor: document.getElementById("sector-stroke-color"),
        sectorFillOpacity: document.getElementById("sector-fill-opacity"),
        sectorFillOpacityVal: document.getElementById("sector-fill-opacity-val"),
        sectorStrokeOpacity: document.getElementById("sector-stroke-opacity"),
        sectorStrokeOpacityVal: document.getElementById("sector-stroke-opacity-val"),
        sectorWeight: document.getElementById("sector-weight"),
        sectorWeightVal: document.getElementById("sector-weight-val")
    };

    function getMapPresetById(id) {
        var i;
        for (i = 0; i < MAP_PRESETS.length; i++) {
            if (MAP_PRESETS[i].id === id) return MAP_PRESETS[i];
        }
        return null;
    }

    function removeMapReferenceLayer() {
        if (state.mapReferenceLayer) {
            map.removeLayer(state.mapReferenceLayer);
            state.mapReferenceLayer = null;
        }
    }

    function syncMapReferenceLabels() {
        removeMapReferenceLayer();
        if (state.activeMapPresetId !== "dark_neutral") return;
        if (!els.mapShowLabels || !els.mapShowLabels.checked) return;
        state.mapReferenceLayer = L.tileLayer(ESRI_DARK_GRAY_REFERENCE_URL, {
            maxZoom: 16,
            opacity: 1
        });
        state.mapReferenceLayer.addTo(map);
    }

    function updateMapLabelsToggleUi() {
        if (!els.mapShowLabels) return;
        var neutral = state.activeMapPresetId === "dark_neutral";
        els.mapShowLabels.disabled = !neutral;
        if (els.mapLabelsWrap) {
            els.mapLabelsWrap.classList.toggle("map-labels-wrap--inactive", !neutral);
        }
    }

    function applyMapPreset(presetId, persist) {
        var preset = getMapPresetById(presetId) || MAP_PRESETS[0];
        removeMapReferenceLayer();
        if (state.baseLayer) {
            map.removeLayer(state.baseLayer);
        }
        var tileOpts = {
            attribution: preset.attribution,
            maxZoom: preset.maxZoom
        };
        if (preset.subdomains != null && preset.subdomains !== "") {
            tileOpts.subdomains = preset.subdomains;
        }
        state.baseLayer = L.tileLayer(preset.url, tileOpts);
        state.baseLayer.addTo(map);
        state.activeMapPresetId = preset.id;
        syncMapReferenceLabels();
        updateMapLabelsToggleUi();

        var mapEl = document.getElementById("map");
        if (mapEl) {
            mapEl.classList.remove(
                "map-tiles--blue",
                "map-tiles--neutral",
                "map-tiles--voyager",
                "map-tiles--light",
                "map-tiles--none"
            );
            mapEl.classList.add("map-tiles--" + preset.tileEffect);
        }

        var shell = document.querySelector(".map-shell");
        if (shell) {
            shell.classList.remove("map-shell--ui-dark", "map-shell--ui-light");
            shell.classList.add(preset.ui === "light" ? "map-shell--ui-light" : "map-shell--ui-dark");
        }

        if (els.mapPreset) {
            var radios = els.mapPreset.querySelectorAll('input[name="map-preset"]');
            var ri;
            for (ri = 0; ri < radios.length; ri++) {
                radios[ri].checked = radios[ri].value === preset.id;
            }
        }
        if (persist) {
            try {
                localStorage.setItem(MAP_PRESET_STORAGE, preset.id);
            } catch (e) { /* ignore */ }
        }
    }

    function initMapShowLabelsUi() {
        if (!els.mapShowLabels) return;
        try {
            var v = localStorage.getItem(MAP_LABELS_STORAGE);
            if (v === "0" || v === "false") els.mapShowLabels.checked = false;
            else els.mapShowLabels.checked = true;
        } catch (e) { /* ignore */ }
        els.mapShowLabels.addEventListener("change", function () {
            try {
                localStorage.setItem(MAP_LABELS_STORAGE, els.mapShowLabels.checked ? "1" : "0");
            } catch (e2) { /* ignore */ }
            syncMapReferenceLabels();
        });
    }

    initMapShowLabelsUi();

    function initMapPresetsUi() {
        var root = els.mapPreset;
        if (!root) {
            applyMapPreset(MAP_PRESETS[0].id, false);
            return;
        }
        MAP_PRESETS.forEach(function (p) {
            var inpId = "map-preset-" + p.id;
            var lab = document.createElement("label");
            lab.className = "toggle map-preset-option";
            var inp = document.createElement("input");
            inp.type = "radio";
            inp.name = "map-preset";
            inp.value = p.id;
            inp.id = inpId;
            var span = document.createElement("span");
            span.textContent = p.label;
            lab.appendChild(inp);
            lab.appendChild(span);
            root.appendChild(lab);
        });
        var saved = null;
        try {
            saved = localStorage.getItem(MAP_PRESET_STORAGE);
        } catch (e) { /* ignore */ }
        var initial = getMapPresetById(saved) ? saved : MAP_PRESETS[0].id;
        applyMapPreset(initial, false);
        root.addEventListener("change", function (ev) {
            var t = ev.target;
            if (t && t.name === "map-preset" && t.checked) {
                applyMapPreset(t.value, true);
            }
        });
    }

    initMapPresetsUi();

    function getSectorPathOptions() {
        return {
            fillColor: sectorStyle.fillColor,
            fillOpacity: sectorStyle.fillOpacity,
            color: sectorStyle.color,
            opacity: sectorStyle.opacity,
            weight: sectorStyle.weight
        };
    }

    function applySectorStyleToLayers() {
        var o = getSectorPathOptions();
        if (state.kmlLayer) state.kmlLayer.setStyle(o);
        if (state.geojsonLayer) state.geojsonLayer.setStyle(o);
    }

    function loadSectorStyleFromStorage() {
        try {
            var raw = localStorage.getItem(SECTOR_STYLE_STORAGE);
            if (!raw) return;
            var o = JSON.parse(raw);
            if (typeof o.fillColor === "string") sectorStyle.fillColor = o.fillColor;
            if (typeof o.color === "string") sectorStyle.color = o.color;
            if (typeof o.fillOpacity === "number" && !isNaN(o.fillOpacity)) {
                sectorStyle.fillOpacity = Math.max(0, Math.min(1, o.fillOpacity));
            }
            if (typeof o.opacity === "number" && !isNaN(o.opacity)) {
                sectorStyle.opacity = Math.max(0, Math.min(1, o.opacity));
            }
            if (typeof o.weight === "number" && !isNaN(o.weight)) {
                sectorStyle.weight = Math.max(0, Math.min(8, Math.round(o.weight)));
            }
        } catch (e) { /* ignore */ }
    }

    function persistSectorStyle() {
        try {
            localStorage.setItem(SECTOR_STYLE_STORAGE, JSON.stringify(sectorStyle));
        } catch (e) { /* ignore */ }
    }

    function syncSectorControlsFromState() {
        if (!els.sectorFillColor) return;
        els.sectorFillColor.value = sectorStyle.fillColor;
        els.sectorStrokeColor.value = sectorStyle.color;
        els.sectorFillOpacity.value = String(Math.round(sectorStyle.fillOpacity * 100));
        els.sectorStrokeOpacity.value = String(Math.round(sectorStyle.opacity * 100));
        els.sectorWeight.value = String(sectorStyle.weight);
        els.sectorFillOpacityVal.textContent = String(Math.round(sectorStyle.fillOpacity * 100));
        els.sectorStrokeOpacityVal.textContent = String(Math.round(sectorStyle.opacity * 100));
        els.sectorWeightVal.textContent = String(sectorStyle.weight);
    }

    function readSectorStyleFromControls() {
        sectorStyle.fillColor = els.sectorFillColor.value;
        sectorStyle.color = els.sectorStrokeColor.value;
        sectorStyle.fillOpacity = Number(els.sectorFillOpacity.value) / 100;
        sectorStyle.opacity = Number(els.sectorStrokeOpacity.value) / 100;
        sectorStyle.weight = Number(els.sectorWeight.value);
        if (isNaN(sectorStyle.fillOpacity)) sectorStyle.fillOpacity = 0;
        if (isNaN(sectorStyle.opacity)) sectorStyle.opacity = 1;
        if (isNaN(sectorStyle.weight)) sectorStyle.weight = 2;
        sectorStyle.fillOpacity = Math.max(0, Math.min(1, sectorStyle.fillOpacity));
        sectorStyle.opacity = Math.max(0, Math.min(1, sectorStyle.opacity));
        sectorStyle.weight = Math.max(0, Math.min(8, Math.round(sectorStyle.weight)));
    }

    function onSectorStyleControlsInput() {
        if (!els.sectorFillColor) return;
        readSectorStyleFromControls();
        els.sectorFillOpacityVal.textContent = String(Math.round(sectorStyle.fillOpacity * 100));
        els.sectorStrokeOpacityVal.textContent = String(Math.round(sectorStyle.opacity * 100));
        els.sectorWeightVal.textContent = String(sectorStyle.weight);
        applySectorStyleToLayers();
        persistSectorStyle();
    }

    function initSectorStyleUi() {
        loadSectorStyleFromStorage();
        syncSectorControlsFromState();
        if (!els.sectorFillColor) return;
        [
            els.sectorFillColor,
            els.sectorStrokeColor,
            els.sectorFillOpacity,
            els.sectorStrokeOpacity,
            els.sectorWeight
        ].forEach(function (el) {
            el.addEventListener("input", onSectorStyleControlsInput);
            el.addEventListener("change", onSectorStyleControlsInput);
        });
    }

    initSectorStyleUi();

    function headerIndex(headerRow, name) {
        return headerRow.indexOf(name);
    }

    function excelSerialToDate(serial) {
        if (serial == null || serial === "") return null;
        var n = Number(serial);
        if (isNaN(n)) return null;
        return new Date(Math.round((n - 25569) * 86400 * 1000));
    }

    function headerIndexAny(headerRow, names) {
        var i;
        for (i = 0; i < names.length; i++) {
            var j = headerRow.indexOf(names[i]);
            if (j >= 0) return j;
        }
        return -1;
    }

    /** Дата из ячейки Excel: серийный номер, Date, строка ISO / dd.mm.yyyy */
    function parseCellToDate(cell) {
        if (cell == null || cell === "") return null;
        if (cell instanceof Date && !isNaN(cell.getTime())) return cell;
        if (typeof cell === "number" && !isNaN(cell)) {
            return excelSerialToDate(cell);
        }
        var s = String(cell).trim();
        if (/^\d+(\.\d+)?$/.test(s)) {
            var n = parseFloat(s);
            if (!isNaN(n)) {
                var d = excelSerialToDate(n);
                if (d) return d;
            }
        }
        var parsed = new Date(s);
        if (!isNaN(parsed.getTime())) return parsed;
        var m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (m) {
            var day = parseInt(m[1], 10);
            var month = parseInt(m[2], 10) - 1;
            var year = parseInt(m[3], 10);
            var d2 = new Date(Date.UTC(year, month, day));
            if (!isNaN(d2.getTime())) return d2;
        }
        return null;
    }

    /** Один календарный день; для серийных дат Excel надёжнее UTC, чтобы не ломалось от часового пояса браузера. */
    function sameCalendarDay(a, b) {
        return (
            a.getUTCFullYear() === b.getUTCFullYear() &&
            a.getUTCMonth() === b.getUTCMonth() &&
            a.getUTCDate() === b.getUTCDate()
        );
    }

    /**
     * ДВД (день в день): календарная дата создания = календарная дата доставки.
     */
    function computeDvdFromDates(created, delivery) {
        if (created && delivery && !isNaN(created.getTime()) && !isNaN(delivery.getTime())) {
            return sameCalendarDay(created, delivery) ? 1 : 0;
        }
        return null;
    }

    function parseCoords(cell) {
        if (cell == null || cell === "") return null;
        var s = String(cell).replace(/[\[\]\s]/g, "");
        var parts = s.split(",");
        if (parts.length !== 2) return null;
        var lat = Number(parts[0]);
        var lng = Number(parts[1]);
        if (isNaN(lat) || isNaN(lng)) return null;
        return [lat, lng];
    }

    function parseRow(row, idx) {
        var latLng = parseCoords(row[idx.coords]);
        if (!latLng) return null;

        var whRaw = idx.warehouse >= 0 ? row[idx.warehouse] : null;
        var warehouse = whRaw != null && whRaw !== ""
            ? (WAREHOUSE_MAP[whRaw] || String(whRaw))
            : "—";

        var deliveryDate = idx.deliveryDate >= 0 ? parseCellToDate(row[idx.deliveryDate]) : null;
        var orderCreated = idx.orderCreated >= 0 ? parseCellToDate(row[idx.orderCreated]) : null;

        var dvdNum = computeDvdFromDates(orderCreated, deliveryDate);
        var dvdLabel;
        if (dvdNum === 1) {
            dvdLabel = "да (день в день)";
        } else if (dvdNum === 0) {
            dvdLabel = "нет";
        } else if (idx.dvd >= 0) {
            var dvdRaw = row[idx.dvd];
            dvdNum = dvdRaw === 1 || dvdRaw === "1" ? 1 : dvdRaw === 0 || dvdRaw === "0" ? 0 : null;
            dvdLabel = dvdNum === 1 ? "да (из столбца)" : dvdNum === 0 ? "нет" : "—";
        } else {
            dvdLabel = "—";
        }

        var amt = idx.amount >= 0 ? parseFloat(row[idx.amount]) : NaN;

        return {
            latLng: latLng,
            orderNumber: idx.order >= 0 ? row[idx.order] : "—",
            status: idx.status >= 0 ? row[idx.status] : "—",
            service: idx.service >= 0 ? row[idx.service] : "—",
            orderCreated: orderCreated,
            deliveryDate: deliveryDate,
            payment: idx.payment >= 0 ? row[idx.payment] : "—",
            amount: isNaN(amt) ? null : amt,
            warehouse: warehouse,
            courier: idx.courier >= 0 ? row[idx.courier] : "—",
            zone: idx.zone >= 0 ? row[idx.zone] : "—",
            interval: idx.interval >= 0 ? row[idx.interval] : "—",
            address: idx.address >= 0 ? row[idx.address] : "—",
            paymentAgent: idx.paymentAgent >= 0 ? row[idx.paymentAgent] : "—",
            dvd: dvdNum,
            dvdLabel: dvdLabel
        };
    }

    function buildIndex(headerRow) {
        var idx = {};
        Object.keys(COL).forEach(function (key) {
            idx[key] = headerIndex(headerRow, COL[key]);
        });
        if (idx.orderCreated < 0) {
            idx.orderCreated = headerIndexAny(headerRow, ORDER_CREATED_ALIASES);
        }
        return idx;
    }

    function processSheet(jsonMatrix) {
        if (!jsonMatrix || jsonMatrix.length < 2) {
            alert("Таблица пуста или некорректна.");
            return;
        }
        var header = jsonMatrix[0];
        var idx = buildIndex(header);
        if (idx.coords < 0) {
            alert("Не найден столбец «Координаты доставки».");
            return;
        }

        var orders = [];
        var i;
        for (i = 1; i < jsonMatrix.length; i++) {
            var o = parseRow(jsonMatrix[i], idx);
            if (o) orders.push(o);
        }

        if (!orders.length) {
            alert("Не удалось извлечь корректные координаты.");
            return;
        }

        state.allOrders = orders;
        populateFilters();
        enableDataUi(true);
        els.legend.hidden = false;
        els.layerHeat.checked = true;
        els.layerHeat.disabled = false;
        els.layerClusters.disabled = false;
        applyView();
        fitToOrders(getFilteredOrders());
    }

    function uniqueSorted(values) {
        var s = {};
        values.forEach(function (v) {
            if (v != null && v !== "" && String(v) !== "—") s[String(v)] = true;
        });
        return Object.keys(s).sort(function (a, b) {
            return a.localeCompare(b, "ru");
        });
    }

    function populateFilters() {
        var orders = state.allOrders;
        function fillSelect(sel, values) {
            sel.innerHTML = "";
            values.forEach(function (v) {
                var opt = document.createElement("option");
                opt.value = v;
                opt.textContent = v;
                sel.appendChild(opt);
            });
        }
        fillSelect(els.filterWarehouse, uniqueSorted(orders.map(function (o) { return o.warehouse; })));
        fillSelect(els.filterStatus, uniqueSorted(orders.map(function (o) { return o.status; })));
        fillSelect(els.filterService, uniqueSorted(orders.map(function (o) { return o.service; })));
        els.filterWarehouse.disabled = false;
        els.filterStatus.disabled = false;
        els.filterService.disabled = false;
        els.filterDvd.disabled = false;
        els.btnFiltersClear.disabled = false;
    }

    function selectedValues(selectEl) {
        return Array.prototype.slice.call(selectEl.selectedOptions).map(function (o) { return o.value; });
    }

    function getFilteredOrders() {
        var orders = state.allOrders;
        var wh = selectedValues(els.filterWarehouse);
        var st = selectedValues(els.filterStatus);
        var sv = selectedValues(els.filterService);
        var dvd = els.filterDvd.value;

        return orders.filter(function (o) {
            if (wh.length && wh.indexOf(String(o.warehouse)) < 0) return false;
            if (st.length && st.indexOf(String(o.status)) < 0) return false;
            if (sv.length && sv.indexOf(String(o.service)) < 0) return false;
            if (dvd === "1" && o.dvd !== 1) return false;
            if (dvd === "0" && o.dvd === 1) return false;
            return true;
        });
    }

    function countBy(orders, keyFn) {
        var c = {};
        orders.forEach(function (o) {
            var k = keyFn(o);
            if (k == null || k === "") k = "—";
            k = String(k);
            c[k] = (c[k] || 0) + 1;
        });
        return c;
    }

    function topEntries(obj, n) {
        return Object.keys(obj)
            .map(function (k) { return [k, obj[k]]; })
            .sort(function (a, b) { return b[1] - a[1]; })
            .slice(0, n);
    }

    function labelOtherIntervalTypes(n) {
        var m10 = n % 10;
        var m100 = n % 100;
        var word;
        if (m10 === 1 && m100 !== 11) word = "тип";
        else if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) word = "типа";
        else word = "типов";
        return "Прочие (" + n + " " + word + ")";
    }

    /** Топ-N интервалов по числу заказов; остальные суммируются в один столбец «Прочие». */
    function aggregateIntervalBars(countObj, topN) {
        var entries = Object.keys(countObj)
            .map(function (k) { return [k, countObj[k]]; })
            .sort(function (a, b) { return b[1] - a[1]; });
        if (!entries.length) return { labels: [], data: [] };
        var head = entries.slice(0, topN);
        var tail = entries.slice(topN);
        var labels = head.map(function (x) { return x[0]; });
        var data = head.map(function (x) { return x[1]; });
        if (tail.length) {
            var sum = 0;
            tail.forEach(function (x) { sum += x[1]; });
            labels.push(labelOtherIntervalTypes(tail.length));
            data.push(sum);
        }
        return { labels: labels, data: data };
    }

    function destroyCharts() {
        state.charts.forEach(function (ch) {
            try { ch.destroy(); } catch (e) { /* ignore */ }
        });
        state.charts = [];
    }

    /** Сколько символов помещается у подписи оси Y при заданной ширине canvas (остальное — в tooltip). */
    function axisCharsBudget(canvasWidth, fontSize, reserveForBarsPx) {
        var w = canvasWidth;
        if (!w || w < 60) w = 336;
        var fs = fontSize || 11;
        var approxCharPx = fs * 0.48;
        var res = reserveForBarsPx != null ? reserveForBarsPx : 118;
        var budgetPx = w - res - 16;
        if (budgetPx < 64) budgetPx = 64;
        var n = Math.floor(budgetPx / approxCharPx);
        return Math.max(18, Math.min(50, n));
    }

    function makeBarChart(canvasId, labels, data, horizontal, extras) {
        extras = extras || {};
        var el = document.getElementById(canvasId);
        if (!el) return;
        extras = Object.assign({}, extras);
        var yTickSize = extras.yTickFontSize || 12;
        if (horizontal && extras.dynamicMaxYLabelFit) {
            var cw = el.offsetWidth;
            if (!cw || cw < 60) {
                var sb = document.querySelector(".sidebar");
                cw = sb ? Math.max(280, sb.offsetWidth - 44) : 336;
            }
            extras.maxYLabelLength = axisCharsBudget(cw, yTickSize, extras.barReservePx);
        }
        var ctx = el.getContext("2d");
        var plugins = { legend: { display: false } };
        if (extras.tooltipFullLabels) {
            plugins.tooltip = {
                callbacks: {
                    title: function (items) {
                        if (!items.length) return "";
                        var i = items[0].dataIndex;
                        return labels[i] != null ? String(labels[i]) : "";
                    }
                }
            };
        }
        var yScale = { grid: { display: false } };
        if (horizontal && extras.maxYLabelLength) {
            yScale.ticks = {
                font: { size: yTickSize },
                autoSkip: false,
                callback: function (val) {
                    var raw = String(this.getLabelForValue(val));
                    var maxL = extras.maxYLabelLength;
                    if (raw.length > maxL) return raw.slice(0, maxL - 1) + "…";
                    return raw;
                }
            };
        } else if (horizontal && extras.yTickFontSize) {
            yScale.ticks = {
                font: { size: extras.yTickFontSize },
                autoSkip: false
            };
        }
        var layoutPad = null;
        if (extras.layoutPadding) {
            layoutPad = {
                left: extras.layoutPadding.left != null ? extras.layoutPadding.left : 0,
                right: extras.layoutPadding.right != null ? extras.layoutPadding.right : 0,
                top: extras.layoutPadding.top != null ? extras.layoutPadding.top : 0,
                bottom: extras.layoutPadding.bottom != null ? extras.layoutPadding.bottom : 0
            };
        }
        var chartOpts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: plugins,
            scales: horizontal
                ? {
                    x: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" } },
                    y: yScale
                }
                : {
                    y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.06)" } },
                    x: { grid: { display: false } }
                }
        };
        if (layoutPad) {
            chartOpts.layout = { padding: layoutPad };
        }
        if (extras.categoryPercentage != null || extras.barPercentage != null) {
            chartOpts.datasets = {
                bar: {
                    categoryPercentage: extras.categoryPercentage != null ? extras.categoryPercentage : 0.8,
                    barPercentage: extras.barPercentage != null ? extras.barPercentage : 0.9
                }
            };
        }
        var cfg = {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(function (_, i) {
                        return CHART_COLORS[i % CHART_COLORS.length];
                    }),
                    borderWidth: 0
                }]
            },
            options: chartOpts
        };
        if (horizontal) cfg.options.indexAxis = "y";
        state.charts.push(new Chart(ctx, cfg));
    }

    function makeDoughnut(canvasId, labels, data) {
        var el = document.getElementById(canvasId);
        if (!el) return;
        var ctx = el.getContext("2d");
        state.charts.push(new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(function (_, i) {
                        return CHART_COLORS[i % CHART_COLORS.length];
                    }),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 } } }
                }
            }
        }));
    }

    function updateCharts(orders) {
        destroyCharts();
        if (!orders.length) return;

        var wh = countBy(orders, function (o) { return o.warehouse; });
        var whTop = topEntries(wh, 20);
        makeBarChart("chart-warehouse", whTop.map(function (x) { return x[0]; }), whTop.map(function (x) { return x[1]; }), false);

        var iv = countBy(orders, function (o) { return o.interval; });
        var ivAgg = aggregateIntervalBars(iv, 12);
        makeBarChart("chart-intervals", ivAgg.labels, ivAgg.data, true, {
            yTickFontSize: 12,
            categoryPercentage: 0.82,
            barPercentage: 0.94,
            tooltipFullLabels: true,
            dynamicMaxYLabelFit: true,
            barReservePx: 125
        });

        var st = countBy(orders, function (o) { return o.status; });
        var stTop = topEntries(st, 12);
        makeDoughnut("chart-status", stTop.map(function (x) { return x[0]; }), stTop.map(function (x) { return x[1]; }));

        var sv = countBy(orders, function (o) { return o.service; });
        var svTop = topEntries(sv, 15);
        makeBarChart("chart-service", svTop.map(function (x) { return x[0]; }), svTop.map(function (x) { return x[1]; }), true, {
            yTickFontSize: 11,
            tooltipFullLabels: true,
            dynamicMaxYLabelFit: true
        });

        var zn = countBy(orders, function (o) { return o.zone; });
        var znTop = topEntries(zn, 12);
        makeBarChart("chart-zones", znTop.map(function (x) { return x[0]; }), znTop.map(function (x) { return x[1]; }), true, {
            yTickFontSize: 11,
            tooltipFullLabels: true,
            dynamicMaxYLabelFit: true
        });

        var pay = countBy(orders, function (o) { return o.payment; });
        var payTop = topEntries(pay, 10);
        makeDoughnut("chart-payment", payTop.map(function (x) { return x[0]; }), payTop.map(function (x) { return x[1]; }));

        var cr = countBy(orders, function (o) { return o.courier; });
        var crTop = topEntries(cr, 10);
        makeBarChart("chart-courier", crTop.map(function (x) { return x[0]; }), crTop.map(function (x) { return x[1]; }), true, {
            yTickFontSize: 11,
            tooltipFullLabels: true,
            dynamicMaxYLabelFit: true
        });
    }

    function updateKpi(orders) {
        var n = orders.length;
        var sum = 0;
        var cntAmt = 0;
        var dvd1 = 0;
        var dvd0 = 0;
        orders.forEach(function (o) {
            if (o.amount != null) {
                sum += o.amount;
                cntAmt++;
            }
            if (o.dvd === 1) dvd1++;
            else dvd0++;
        });
        var avg = cntAmt ? sum / cntAmt : 0;
        document.getElementById("kpi-orders").textContent = n.toLocaleString("ru-RU");
        document.getElementById("kpi-sum").textContent = sum.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
        document.getElementById("kpi-avg").textContent = cntAmt
            ? avg.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
            : "—";
        document.getElementById("kpi-dvd").textContent = n
            ? dvd1.toLocaleString("ru-RU") + " / " + dvd0.toLocaleString("ru-RU")
            : "—";
    }

    function popupHtml(o) {
        var createdStr = o.orderCreated
            ? o.orderCreated.toLocaleString("ru-RU")
            : "—";
        var dStr = o.deliveryDate
            ? o.deliveryDate.toLocaleString("ru-RU")
            : "—";
        var amt = o.amount != null ? o.amount.toFixed(2) + " ₽" : "—";
        return (
            "<b>Номер заказа:</b> " + escapeHtml(String(o.orderNumber)) + "<br/>" +
            "<b>Статус:</b> " + escapeHtml(String(o.status)) + "<br/>" +
            "<b>Служба доставки:</b> " + escapeHtml(String(o.service)) + "<br/>" +
            "<b>Дата создания:</b> " + escapeHtml(createdStr) + "<br/>" +
            "<b>Дата доставки:</b> " + escapeHtml(dStr) + "<br/>" +
            "<b>Оплата:</b> " + escapeHtml(String(o.payment)) + "<br/>" +
            "<b>Сумма:</b> " + escapeHtml(amt) + "<br/>" +
            "<b>Склад:</b> " + escapeHtml(String(o.warehouse)) + "<br/>" +
            "<b>Курьер:</b> " + escapeHtml(String(o.courier)) + "<br/>" +
            "<b>Зона:</b> " + escapeHtml(String(o.zone)) + "<br/>" +
            "<b>Интервал:</b> " + escapeHtml(String(o.interval)) + "<br/>" +
            "<b>Адрес:</b> " + escapeHtml(String(o.address)) + "<br/>" +
            "<b>Агент:</b> " + escapeHtml(String(o.paymentAgent)) + "<br/>" +
            "<b>ДВД (день в день):</b> " + escapeHtml(o.dvdLabel)
        );
    }

    function escapeHtml(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    }

    function removeHeat() {
        if (state.heatLayer && map.hasLayer(state.heatLayer)) {
            map.removeLayer(state.heatLayer);
        }
        state.heatLayer = null;
    }

    function removeMarkersFromMap() {
        if (map.hasLayer(state.markers)) {
            map.removeLayer(state.markers);
        }
    }

    function rebuildHeat(orders) {
        removeHeat();
        if (!els.layerHeat.checked || !orders.length) return;
        var pts = orders.map(function (o) {
            return [o.latLng[0], o.latLng[1], 1];
        });
        var r = parseInt(els.heatRadius.value, 10);
        var b = parseInt(els.heatBlur.value, 10);
        state.heatLayer = L.heatLayer(pts, {
            radius: r,
            blur: b,
            maxZoom: 17,
            gradient: {
                0.2: "#3b5bdb",
                0.45: "#15aabf",
                0.7: "#fcc419",
                1: "#fa5252"
            }
        });
        map.addLayer(state.heatLayer);
    }

    function rebuildMarkers(orders) {
        state.markers.clearLayers();
        removeMarkersFromMap();
        if (!els.layerClusters.checked || !orders.length) return;
        orders.forEach(function (o) {
            var m = L.marker(o.latLng).bindPopup(popupHtml(o));
            state.markers.addLayer(m);
        });
        map.addLayer(state.markers);
    }

    function applyView() {
        var orders = getFilteredOrders();
        updateKpi(orders);
        updateCharts(orders);
        rebuildHeat(orders);
        rebuildMarkers(orders);
    }

    function fitToOrders(orders) {
        if (!orders.length) return;
        var b = orders.map(function (o) { return o.latLng; });
        map.fitBounds(L.latLngBounds(b), { padding: [48, 48], maxZoom: 14 });
    }

    function enableDataUi(on) {
        els.btnReset.disabled = !on;
        els.btnExport.disabled = !on;
        els.heatControls.style.opacity = on ? "1" : "0.45";
        els.heatRadius.disabled = !on;
        els.heatBlur.disabled = !on;
    }

    function clearAll() {
        state.allOrders = [];
        removeHeat();
        state.markers.clearLayers();
        removeMarkersFromMap();
        if (state.kmlLayer) {
            map.removeLayer(state.kmlLayer);
            state.kmlLayer = null;
        }
        if (state.geojsonLayer) {
            map.removeLayer(state.geojsonLayer);
            state.geojsonLayer = null;
        }
        destroyCharts();
        updateKpi([]);
        els.legend.hidden = true;
        els.layerHeat.checked = false;
        els.layerClusters.checked = false;
        els.layerHeat.disabled = true;
        els.layerClusters.disabled = true;
        els.fileExcel.value = "";
        els.excelName.textContent = "Файл не выбран";
        els.filterWarehouse.innerHTML = "";
        els.filterStatus.innerHTML = "";
        els.filterService.innerHTML = "";
        els.filterWarehouse.disabled = true;
        els.filterStatus.disabled = true;
        els.filterService.disabled = true;
        els.filterDvd.value = "";
        els.filterDvd.disabled = true;
        els.btnFiltersClear.disabled = true;
        els.kmlName.textContent = "—";
        els.geojsonName.textContent = "—";
        els.fileKml.value = "";
        els.fileGeojson.value = "";
        els.btnClearSectors.disabled = true;
        enableDataUi(false);
        document.getElementById("kpi-orders").textContent = "—";
        document.getElementById("kpi-sum").textContent = "—";
        document.getElementById("kpi-avg").textContent = "—";
        document.getElementById("kpi-dvd").textContent = "—";
        map.setView([55.751244, 37.618423], 10);
    }

    function exportCsv() {
        var orders = getFilteredOrders();
        if (!orders.length) return;
        var headers = [
            "Номер заказа", "Широта", "Долгота", "Статус", "Служба доставки",
            "Дата создания", "Дата доставки", "Сумма", "Склад", "Зона", "Интервал", "ДВД", "Адрес"
        ];
        var rows = orders.map(function (o) {
            return [
                o.orderNumber,
                o.latLng[0],
                o.latLng[1],
                o.status,
                o.service,
                o.orderCreated ? o.orderCreated.toISOString() : "",
                o.deliveryDate ? o.deliveryDate.toISOString() : "",
                o.amount != null ? o.amount : "",
                o.warehouse,
                o.zone,
                o.interval,
                o.dvdLabel,
                o.address
            ].map(csvEscape).join(";");
        });
        var bom = "\uFEFF";
        var blob = new Blob([bom + headers.join(";") + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "orders_export.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function csvEscape(v) {
        var s = String(v == null ? "" : v);
        if (/[;"\n]/.test(s)) return "\"" + s.replace(/"/g, '""') + "\"";
        return s;
    }

    if (typeof Chart !== "undefined") {
        Chart.defaults.color = "#8b9cb3";
        Chart.defaults.borderColor = "rgba(255,255,255,0.08)";
    }

    els.fileExcel.addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (!file) return;
        els.excelName.textContent = file.name;
        var reader = new FileReader();
        reader.onload = function (ev) {
            var data = new Uint8Array(ev.target.result);
            var wb = XLSX.read(data, { type: "array" });
            var sheet = wb.Sheets[wb.SheetNames[0]];
            var json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
            processSheet(json);
        };
        reader.readAsArrayBuffer(file);
    });

    els.btnReset.addEventListener("click", clearAll);
    els.btnExport.addEventListener("click", exportCsv);

    els.layerHeat.addEventListener("change", function () {
        if (!state.allOrders.length) return;
        rebuildHeat(getFilteredOrders());
    });

    els.layerClusters.addEventListener("change", function () {
        if (!state.allOrders.length) return;
        rebuildMarkers(getFilteredOrders());
    });

    function onHeatParamChange() {
        els.heatRadiusVal.textContent = els.heatRadius.value;
        els.heatBlurVal.textContent = els.heatBlur.value;
        if (state.allOrders.length && els.layerHeat.checked) {
            rebuildHeat(getFilteredOrders());
        }
    }

    els.heatRadius.addEventListener("input", onHeatParamChange);
    els.heatBlur.addEventListener("input", onHeatParamChange);

    [els.filterWarehouse, els.filterStatus, els.filterService, els.filterDvd].forEach(function (el) {
        el.addEventListener("change", function () {
            applyView();
            fitToOrders(getFilteredOrders());
        });
    });

    els.btnFiltersClear.addEventListener("click", function () {
        [els.filterWarehouse, els.filterStatus, els.filterService].forEach(function (sel) {
            Array.prototype.forEach.call(sel.options, function (o) { o.selected = false; });
        });
        els.filterDvd.value = "";
        applyView();
        fitToOrders(getFilteredOrders());
    });

    els.fileKml.addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (!file) return;
        els.kmlName.textContent = file.name;
        els.btnClearSectors.disabled = false;
        var reader = new FileReader();
        reader.onload = function (ev) {
            if (state.kmlLayer) map.removeLayer(state.kmlLayer);
            state.kmlLayer = omnivore.kml.parse(ev.target.result).on("ready", function () {
                this.eachLayer(function (layer) {
                    var desc = layer.feature && layer.feature.properties
                        ? (layer.feature.properties.description || layer.feature.properties.name || "Объект")
                        : "Объект";
                    layer.bindPopup(desc);
                });
                this.setStyle(getSectorPathOptions());
                try {
                    map.fitBounds(state.kmlLayer.getBounds(), { padding: [40, 40] });
                } catch (err) { /* ignore */ }
            }).addTo(map);
        };
        reader.readAsText(file);
    });

    els.fileGeojson.addEventListener("change", function (e) {
        var file = e.target.files[0];
        if (!file) return;
        els.geojsonName.textContent = file.name;
        els.btnClearSectors.disabled = false;
        var reader = new FileReader();
        reader.onload = function (ev) {
            try {
                var geo = JSON.parse(ev.target.result);
                if (state.geojsonLayer) map.removeLayer(state.geojsonLayer);
                state.geojsonLayer = L.geoJSON(geo, {
                    style: function () {
                        return getSectorPathOptions();
                    },
                    onEachFeature: function (feature, layer) {
                        var t = (feature.properties && (feature.properties.description || feature.properties.name)) || "Объект";
                        layer.bindPopup(t);
                    }
                }).addTo(map);
                map.fitBounds(state.geojsonLayer.getBounds(), { padding: [40, 40] });
            } catch (err) {
                alert("Не удалось разобрать GeoJSON.");
            }
        };
        reader.readAsText(file);
    });

    els.btnClearSectors.addEventListener("click", function () {
        if (state.kmlLayer) {
            map.removeLayer(state.kmlLayer);
            state.kmlLayer = null;
        }
        if (state.geojsonLayer) {
            map.removeLayer(state.geojsonLayer);
            state.geojsonLayer = null;
        }
        els.fileKml.value = "";
        els.fileGeojson.value = "";
        els.kmlName.textContent = "—";
        els.geojsonName.textContent = "—";
        els.btnClearSectors.disabled = true;
    });

    window.addEventListener("resize", function () {
        map.invalidateSize();
    });

    document.getElementById("charts-accordion").addEventListener("toggle", function (e) {
        if (e.target.tagName === "DETAILS" && e.target.open) {
            setTimeout(function () {
                state.charts.forEach(function (c) {
                    try { c.resize(); } catch (err) { /* ignore */ }
                });
            }, 80);
        }
    });
})();
