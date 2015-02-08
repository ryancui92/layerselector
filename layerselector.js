/** 
 * 层级选择器-插件 1.0
 */

var LayerSelector = function(config) {
	this.init(config);
};

LayerSelector.prototype = {
	constrcutor: LayerSelector,
	defaults: {
		width: 320,
		height: 200,
		title: 'Search Sites',
		column: 4,
		layers: [],
		onSelectData: function(data) {}
	},
	defaultLayer: {
		dataProvider: function(selected) {},
		idField: 'id',
		labelField: 'label',
		prompt: 'Select',
		otherItem: function(selected) {return false;},
		multiple: false
	},
	init: function(config) {
		var that = this;
		that.cacheData(config);		// 缓存数据
		that.initMain();			// 初始化
	},
	cacheData: function(config) {
		var that = this;
		// 初始化
		that.config = $.extend({}, that.defaults, config);
		for (var i=0; i<that.config.layers.length; i++) {
			that.config.layers[i] = $.extend({}, that.defaultLayer, that.config.layers[i]);
		}
		console.log(that.config);
		
		$('body').append('<div id="layerSelector"><div id="tabs"></div></div>');
		that.$dialog = $("#layerSelector");
		that.$tabs = $("#tabs");
		that.columnWidth = Math.floor(that.config.width/that.config.column);
		
		that.layerData = [];		// 每一层的数据
		that.selected = [];			// 每一层的选择
	},
	initMain: function() {
		var that = this;
		that.$dialog.dialog({
			title: that.config.title,
		    width: that.config.width+50,    
		    height: that.config.height,    
		    closed: true,    
		    modal: true  
		});
		that.$tabs.tabs({
			border: false,
			fit: true,
			onAdd: function(title, layer) {
				if (that.config.layers[layer].otherItem(layer==0 ? null : that.selected[layer-1])) {
					that.$otherText = $("[name='othertext"+layer+"']");
					that.$otherText.textbox({
						buttonText: '确定',
						onClickButton: function() {
							var val = that.$otherText.textbox('getText');
							var data = {};
							data[that.config.layers[layer].labelField] = val;
							that.selected[layer] = data;
							that._onSelectLayer(layer, data);
						}
					});
				}
			}
		});
		
		// item鼠标悬停效果
		that.$dialog.delegate('.link', 'mouseover', function() {
			$(this).addClass('focus');
		});
		that.$dialog.delegate('.link', 'mouseout', function() {
			$(this).removeClass('focus');
		});
		
		// item选择事件
		that.$dialog.delegate('.link', 'click', function() {
			var id = $(this).data('id'),						// 选中item的id
				tab = that.$tabs.tabs('getSelected'),			
				layer = that.$tabs.tabs('getTabIndex', tab),	// 当前所在层
				data = null;
			
			if (id == 'other') {
				return;
			}
			
			// 找到对应的data
			for (var i in that.layerData[layer]) {
				if ( that.layerData[layer][i][that.config.layers[layer].idField] == id ) {
					data = that.layerData[layer][i];
					that.selected[layer] = data;				// 设置当前已经选择的数据项 
					break;
				}
			}
			
			that._onSelectLayer(layer, data);
		});
		
		// tab页面鼠标悬停显示该tab
		that.$dialog.delegate('ul.tabs>li', 'mouseover', function() {
			that.$tabs.tabs('select', $(this).index());
		});
		
		// 显示第一层数据
		that.layerData[0] = that.config.layers[0].dataProvider();
		that._addTab(0);
	},
	open: function() {
		var that = this;
		that.$dialog.dialog('open');
	},
	_addTab: function(layer) {
		// 添加一个tab页面并跳到该页面
		var that = this, contentObj = that._generateContent(layer);
		that.$tabs.tabs('add', {
			title: that.config.layers[layer].prompt,
			selected: true,
			content: contentObj.content
		});
		
	},
	_generateContent: function(layer) {
		// 生成某一层的UI
		var that = this, obj = that.layerData[layer], lineArr = [], line = '', ret = {};
		for (var i=0; i<obj.length; i++) {
			line += '<div style="width:' + that.columnWidth + 'px;"><label data-id="' + 
					obj[i][that.config.layers[layer].idField] + '" class="link">' + 
					obj[i][that.config.layers[layer].labelField] + '</label></div>';
			if (i%that.config.column == that.config.column-1) {
				lineArr.push(line);
				line = '';
			}
		}
		if (line != '') {
			lineArr.push(line);
		} 
		ret.content = '<div style="width:'+(that.config.width)+'px;" class="line">' + 
				lineArr.join('</div><div style="width:'+(that.config.width)+'px;" class="line">') + '</div>';
		
		// 添加其他选项
		if (that.config.layers[layer].otherItem(layer==0 ? null : that.selected[layer-1])) {
			var str = '<div style="width:'+(that.config.width)+'px;" class="line"><div style="width:' + that.columnWidth + 
					'px;"><label data-id="other" class="link">其他</label></div>' +
					'<div style="width:'+(that.columnWidth*(that.config.column-1))+'px;"><input name="othertext'+layer+'" style="width:100%;"></div>' + 
					'</div>';
			ret.content += str;
		}
		ret.rows = lineArr.length;
		return ret;
	},
	_onSelectLayer: function(layer, data) {
		var that = this;
		
		// 已经选择了最后一层
		if (layer == that.config.layers.length-1) {
			if (that.config.onSelectData(that.selected)) {
				that.$dialog.dialog('close');
			}
			return;
		}
		
		// 将当前tab的标题改为选中的item
		var thisTab = that.$tabs.tabs('getTab', layer);
		that.$tabs.tabs('update', {
			tab: thisTab,
			options: {
				title: data[that.config.layers[layer].labelField]
			}
		});
		
		// 关闭选中的layer之后的tabs
		var allTabs = that.$tabs.tabs('tabs');
		for (var i=allTabs.length-1; i>layer; i--) {
			that.$tabs.tabs('close', i);
		}
		
		// 加载下一层的数据
		that.layerData[layer+1] = that.config.layers[layer+1].dataProvider(data);
		
		// 增加一个tab
		that._addTab(layer+1);
	}
}

