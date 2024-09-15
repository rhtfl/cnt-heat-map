// Инициализация карты и базовых слоев
var map = L.map('map').setView([55.751244, 37.618423], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Создание группы для кластеризации
var markers = L.markerClusterGroup();

// Создание слоя для тепловой карты
var heatLayer;

// Определение переменных для слоев KML и GeoJSON
var geojsonLayer = null;
var kmlLayer = null;

// Глобальные переменные для хранения данных по складам и интервалам доставки
var warehouseCounts = {};
var deliveryIntervalCounts = {};

document.getElementById('file-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    var reader = new FileReader();

    reader.onload = function(event) {
        var data = new Uint8Array(event.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
        processExcelData(json);
    };

    reader.readAsArrayBuffer(file);
});

function processExcelData(data) {
    var heatData = [];
    var header = data[0];

    // Проверка наличия столбцов
    var coordIndex = header.indexOf("Координаты доставки");
    var orderNumberIndex = header.indexOf("Номер заказа");
    var statusIndex = header.indexOf("Статус заказа");
    var deliveryServiceIndex = header.indexOf("Служба доставки");
    var deliveryDateIndex = header.indexOf("Дата доставки");
    var paymentMethodIndex = header.indexOf("Способ оплаты");
    var orderAmountIndex = header.indexOf("Сумма заказа");
    var warehouseIndex = header.indexOf("Склад");
    var courierIndex = header.indexOf("Курьер");
    var deliveryZoneIndex = header.indexOf("Зона доставки");
    var deliveryIntervalIndex = header.indexOf("Интервал доставки");
    var dvdIndex = header.indexOf("ДВД");
    var deliveryAddressIndex = header.indexOf("Адрес доставки");
    var paymentAgentIndex = header.indexOf("Агент приема платежей");

    if (coordIndex === -1) {
        alert("Не найден столбец 'Координаты доставки' в таблице.");
        return;
    }

    // Маппинг названий складов
    var warehouseMapping = {
        'MSKVOSTOK': 'ИМ Восток',
        'MSK': 'ИМ Центр',
        'MSKSEVER': 'ИМ Север',
        'NOGINSK': 'ИМ Ногинск'
    };

    // Инициализация переменных
    var totalOrders = 0;
    var totalAmount = 0;
    var dvd1Count = 0;
    var dvd0Count = 0;
    warehouseCounts = {};
    deliveryIntervalCounts = {};

    for (var i = 1; i < data.length; i++) {
        var coords = data[i][coordIndex];
        if (coords) {
            coords = coords.replace(/[\[\]\s]/g, '').split(',');
            var latLng = coords.map(Number);

            if (latLng.length === 2 && !isNaN(latLng[0]) && !isNaN(latLng[1])) {
                heatData.push([...latLng, 1]);

                // Получение данных из таблицы с проверкой наличия столбцов
                var orderNumber = orderNumberIndex !== -1 ? data[i][orderNumberIndex] : 'нет данных';
                var status = statusIndex !== -1 ? data[i][statusIndex] : 'нет данных';
                var deliveryService = deliveryServiceIndex !== -1 ? data[i][deliveryServiceIndex] : 'нет данных';
                var deliveryDate = deliveryDateIndex !== -1 ? new Date(Math.round((data[i][deliveryDateIndex] - 25569) * 86400 * 1000)).toLocaleString() : 'нет данных';
                var paymentMethod = paymentMethodIndex !== -1 ? data[i][paymentMethodIndex] : 'нет данных';
                var orderAmount = orderAmountIndex !== -1 ? parseFloat(data[i][orderAmountIndex]) : null;
                var warehouse = warehouseIndex !== -1 ? (warehouseMapping[data[i][warehouseIndex]] || data[i][warehouseIndex]) : 'нет данных';
                var courier = courierIndex !== -1 ? data[i][courierIndex] : 'нет данных';
                var deliveryZone = deliveryZoneIndex !== -1 ? data[i][deliveryZoneIndex] : 'нет данных';
                var deliveryInterval = deliveryIntervalIndex !== -1 ? data[i][deliveryIntervalIndex] : 'нет данных';
                var deliveryAddress = deliveryAddressIndex !== -1 ? data[i][deliveryAddressIndex] : 'нет данных';
                var paymentAgent = paymentAgentIndex !== -1 ? data[i][paymentAgentIndex] : 'нет данных';
                var dvd = dvdIndex !== -1 ? (data[i][dvdIndex] === 1 ? 'да' : 'нет') : 'нет данных';

                // Подсчет общего количества заказов и суммы заказов
                totalOrders++;
                if (orderAmount) {
                    totalAmount += parseFloat(orderAmount);
                }

                // Подсчет количества заказов с и без DVD
                if (dvdIndex !== -1) {
                    if (data[i][dvdIndex] === 1) {
                        dvd1Count++;
                    } else {
                        dvd0Count++;
                    }
                }

                // Обработка данных по складам
                if (warehouse !== 'нет данных') {
                    warehouseCounts[warehouse] = (warehouseCounts[warehouse] || 0) + 1;
                }

                // Обработка данных по интервалам доставки
                if (deliveryInterval !== 'нет данных') {
                    deliveryIntervalCounts[deliveryInterval] = (deliveryIntervalCounts[deliveryInterval] || 0) + 1;
                }

                // Создание маркера на карте
                var marker = L.marker(latLng)
                    .bindPopup(`
                        <b>Номер заказа:</b> ${orderNumber}<br/>
                        <b>Статус заказа:</b> ${status}<br/>
                        <b>Служба доставки:</b> ${deliveryService}<br/>
                        <b>Дата доставки:</b> ${deliveryDate}<br/>
                        <b>Способ оплаты:</b> ${paymentMethod}<br/>
                        <b>Сумма заказа:</b> ${orderAmount ? orderAmount.toFixed(2) + ' ₽' : 'нет данных'}<br/>
                        <b>Склад:</b> ${warehouse}<br/>
                        <b>Курьер:</b> ${courier}<br/>
                        <b>Зона доставки:</b> ${deliveryZone}<br/>
                        <b>Интервал доставки:</b> ${deliveryInterval}<br/>
                        <b>Адрес доставки:</b> ${deliveryAddress}<br/>
                        <b>Агент приема платежей:</b> ${paymentAgent}<br/>
                        <b>ДВД:</b> ${dvd}
                    `);
                markers.addLayer(marker);
            }
        }
    }

    if (heatData.length > 0) {
        heatLayer = L.heatLayer(heatData, {
            radius: 25,
            gradient: {
                0.2: '#0000ff',
                0.4: '#00ff00',
                0.6: '#ffff00',
                1.0: '#ff0000'
            }
        });

        map.addLayer(heatLayer);
        document.getElementById('legend').style.display = 'block';
        setActiveButton('heatmap-btn');
    } else {
        alert("Не удалось извлечь корректные координаты из таблицы.");
    }

    // Отображение сводной информации
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-amount').textContent = totalAmount.toFixed(2) + ' ₽';
    document.getElementById('dvd-1-count').textContent = dvd1Count;
    document.getElementById('dvd-0-count').textContent = dvd0Count;

    document.getElementById('summary').style.display = 'block';
    renderCharts(warehouseCounts, deliveryIntervalCounts); // Вызов функции для отображения диаграмм
}


// Обработчик кнопки "Тепловая карта"
document.getElementById('heatmap-btn').onclick = function() {
    if (map.hasLayer(markers)) {
        map.removeLayer(markers); // Убираем кластеры
    }
    if (!map.hasLayer(heatLayer)) {
        map.addLayer(heatLayer); // Добавляем тепловую карту
    }
    document.getElementById('legend').style.display = 'block'; // Показываем легенду
    document.getElementById('summary').style.display = 'block'; // Показываем сводную информацию
    setActiveButton('heatmap-btn'); // Активируем кнопку тепловой карты
};

// Обработчик кнопки "Кластеры"
document.getElementById('cluster-btn').onclick = function() {
    if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer); // Убираем тепловую карту
    }
    if (!map.hasLayer(markers)) {
        map.addLayer(markers); // Добавляем кластеры
    }
    document.getElementById('legend').style.display = 'none'; // Скрываем легенду
    document.getElementById('summary').style.display = 'block'; // Показываем сводную информацию
    setActiveButton('cluster-btn'); // Активируем кнопку кластеров
};

// Очистка слоев и сброс активных кнопок
document.getElementById('clear-layers-btn').onclick = function() {
    if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer); // Убираем тепловую карту
    }
    if (map.hasLayer(markers)) {
        markers.clearLayers(); // Убираем все маркеры из кластера
    }
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer); // Убираем GeoJSON слой, если он есть
    }
    if (kmlLayer) {
        map.removeLayer(kmlLayer); // Убираем KML слой, если он есть
    }
    if (customKmlLayer) {
        map.removeLayer(customKmlLayer); // Убираем пользовательский KML слой
    }

    // Очистка данных, чтобы избежать наложения
    warehouseCounts = {};
    deliveryIntervalCounts = {};
    heatLayer = null; // Сбрасываем ссылку на тепловую карту
    markers = L.markerClusterGroup(); // Создаем новый пустой кластер для маркеров
    geojsonLayer = null; // Сбрасываем ссылку на GeoJSON слой
    kmlLayer = null; // Сбрасываем ссылку на KML слой

    document.getElementById('legend').style.display = 'none'; // Скрываем легенду
    document.getElementById('summary').style.display = 'none'; // Скрываем сводную информацию
    setActiveButton(null); // Сбрасываем активную кнопку

    // Очистка данных сводной информации
    document.getElementById('total-orders').textContent = '';
    document.getElementById('total-amount').textContent = '';
    document.getElementById('dvd-1-count').textContent = '';
    document.getElementById('dvd-0-count').textContent = '';
};

// Установка активной кнопки
function setActiveButton(buttonId) {
    document.querySelectorAll('.button-group button').forEach(btn => btn.classList.remove('active'));
    if (buttonId) {
        document.getElementById(buttonId).classList.add('active');
    }
}

// Переменная для пользовательского KML слоя
var customKmlLayer = null;

document.getElementById('custom-kml-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(event) {
            var kmlData = event.target.result;
            
            // Удаляем предыдущий пользовательский KML, если он есть
            if (customKmlLayer) {
                map.removeLayer(customKmlLayer);
            }

            // Создаем новый слой из пользовательского KML
            customKmlLayer = omnivore.kml.parse(kmlData).on('ready', function() {
                this.eachLayer(function(layer) {
                    layer.bindPopup(layer.feature.properties ? layer.feature.properties.description : "Объект");
                });
                map.fitBounds(customKmlLayer.getBounds());
            }).addTo(map);
        };
        reader.readAsText(file);
    }
});

// Загружайте и обрабатывайте KML и GeoJSON файлы
document.getElementById('kml-btn').onclick = function() {
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer); // Убираем GeoJSON слой, если он есть
    }
    if (kmlLayer) {
        map.removeLayer(kmlLayer); // Убираем предыдущий KML слой, если он есть
    }
    kmlLayer = omnivore.kml('object.kml')
        .on('ready', function() {
            this.eachLayer(function(layer) {
                layer.bindPopup(layer.feature.properties ? layer.feature.properties.description || "Объект" : "Объект");
            });
            map.fitBounds(kmlLayer.getBounds());
        })
        .addTo(map);
    setActiveButton('kml-btn');
};


document.getElementById('geojson-btn').onclick = function() {
    if (kmlLayer) {
        map.removeLayer(kmlLayer); // Убираем KML слой, если он есть
    }
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer); // Убираем предыдущий GeoJSON слой, если он есть
    }
    fetch('object.geojson')
        .then(response => response.json())
        .then(data => {
            geojsonLayer = L.geoJSON(data, {
                style: processGeoJSONStyles,
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(feature.properties.description || "Объект");
                }
            }).addTo(map);
            map.fitBounds(geojsonLayer.getBounds());
        });
    setActiveButton('geojson-btn');
};

// Функция для обработки стилей из KML файла
function processKMLStyles(layer) {
    if (layer instanceof L.Path) {
        var color = layer.options.color || '#3388ff'; // стандартный цвет Leaflet
        layer.setStyle({
            color: color,
            weight: 2
        });
    }
}

// Функция для обработки стилей из GeoJSON файла
function processGeoJSONStyles(feature) {
    return {
        color: feature.properties.fill || '#3388ff', // цвет линии
        weight: 2
    };
}

