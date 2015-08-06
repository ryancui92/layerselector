var colorParam = {
    required: true,
    column: 3,
    panelWidth: 300,
    panelHeight: 320,
//  multiple: true,
    okText: '确定',
    layers: [{
        field: 'sheng',
        prompt: '选择省份',
        idField: 'id',
        labelField: 'name',
        dataProvider: function(selected) {
            return district_sheng;
        },
    },{
        field: 'shi',
        prompt: '选择城市',
        idField: 'id',
        labelField: 'name',
        dataProvider: function(selected) {
            var ret = [];
            for (var i=0; i<district_shi.length; i++) {
                if (district_shi[i].parentId === selected.id) {
                    ret.push(district_shi[i]);
                }
            }
            return ret;
        },
        otherItem: function(selected) {return true},
        otherText: '其他',
        otherOkText: '确定'
    }],
};

$('#district').layerselector(colorParam);