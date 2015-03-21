var colorParam = {
	column: 5,
	panelWidth: 300,
	panelHeight: 200,
	multiple: true,
	okText: '确定',
	layers: [{
		field: 'color1',
		prompt: '选择颜色一',
		idField: 'id',
		labelField: 'name',
		dataProvider: function(selected) {
			return [{
				id: 1, name: '红色'
			}, {
				id: 2, name: '黄色'
			}, {
				id: 3, name: '蓝色'
			}, {
				id: 4, name: '绿色'
			}];
		},
	},{
		field: 'color2',
		prompt: '选择颜色二',
		idField: 'id',
		labelField: 'name',
		dataProvider: function(selected) {
			switch (selected.id) {
			case 1:
				return [{
					id: 1, name: '浅红'
				}, {
					id: 2, name: '深红'
				}];break;
			case 2:
				return [{
					id: 1, name: '浅黄'
				}, {
					id: 2, name: '深黄'
				}];break;
			case 3:
				return [{
					id: 1, name: '浅蓝'
				}, {
					id: 2, name: '深蓝'
				}];break;
			case 4:
				return [{
					id: 1, name: '浅绿'
				}, {
					id: 2, name: '深绿'
				}];break;
			}
		},
		otherItem: function(selected) {return true},
		otherText: '其他',
		otherOkText: '选择这种颜色'
	}],
};

$('#color').layerselector(colorParam);