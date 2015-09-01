var siteInfo = [];
var provinceList = [];
var cityList = [];
var areaList = [];

var seletedProvince = null;
var seletedCity = null;
var seletedArea = null;

$.ajax({
    url: 'chinese-site.json',
    method: 'GET',
    async: false,
}).success(function(data) {
    siteInfo = data;
});

$.each(siteInfo, function(i, v) {
    var object = {};
    object.name = v.name;
    provinceList.push(object);
});

var param = {
    column: 5,
    panelWidth: 350,
    panelHeight: 200,
    multiple: true,
    layers: [{
        field: 'sheng',
        prompt: '选择省份',
        idField: 'name',
        labelField: 'name',
        dataProvider: function(selected) {
            return provinceList;
        },
    }, {
        field: 'shi',
        prompt: '选择城市',
        idField: 'name',
        labelField: 'name',
        dataProvider: function(selected) {
            seletedProvince = selected.name;
            cityList = [];
            $.each(siteInfo, function(i, v) {
                if (v.name === selected.name) {
                    $.each(v.city, function(i, v) {
                        var object = {};
                        object.name = v.name;
                        cityList.push(object);
                    });

                    return true;
                }
            });
            return cityList;
        }
    }, {
        field: 'qu',
        prompt: '选择区',
        idField: 'name',
        labelField: 'name',
        dataProvider: function(selected) {
            seletedCity = selected.name;
            areaList = [];
            $.each(siteInfo, function(i, v) {
                if (v.name === seletedProvince) {
                    $.each(v.city, function(i, v) {
                        if (v.name === selected.name) {
                            $.each(v.area, function(i, v) {
                                var object = {};
                                object.name = v;
                                areaList.push(object);
                            });
                            return true;
                        }
                    });
                    return true;
                }
            });
            return areaList;
        }
    }]
};

$('#district-multiple').layerselector(param);

$('#district-other').layerselector({
    layers: [{
        field: 'language',
        dataProvider: function() {
            return [{
                id: 'C++',
                label: 'C++'
            }, {
                id: 'Java',
                label: 'Java'
            }, {
                id: 'Cobol',
                label: 'Cobol'
            }];
        }
    }]
});